import "@esri/calcite-components/main.css";
import { setAssetPath } from "@esri/calcite-components";
import { defineCustomElements } from "@esri/calcite-components/loader";
import type { GeometryFormat, GeometryTableScanResult, ServiceConfiguration } from "@databricks-spatial-service-builder/shared";
import { useMemo, useState } from "react";
import { DataList } from "./components/DataList";
import { StepRail } from "./components/StepRail";
import { localeLabels, translations, type Locale } from "./i18n/translations";
import { api } from "./services/api";
import { signIn } from "./services/arcgisAuth";
import type { TableInfo, WizardState } from "./types/app";
import "./styles.css";

setAssetPath("/calcite");
defineCustomElements(window);

const clientId = import.meta.env.VITE_ARCGIS_CLIENT_ID ?? "";
const defaultPortal = import.meta.env.VITE_PORTAL_URL ?? "https://www.arcgis.com";
const geometryFormats: GeometryFormat[] = ["GEOMETRY", "WKT", "WKB", "GEOJSON", "WKT_DECIMAL_COMMA"];
const calciteDisabled = (disabled: boolean) => (disabled ? { disabled: true } : {});

function getInitialLocale(): Locale {
  const stored = localStorage.getItem("databricks-builder-locale");
  if (stored === "ca" || stored === "es") return stored;
  return navigator.language.toLowerCase().startsWith("es") ? "es" : "ca";
}

function fullTableName(state: WizardState) {
  if (!state.selectedCatalog || !state.selectedSchema || !state.selectedTable) return "";
  return `${state.selectedCatalog}.${state.selectedSchema}.${state.selectedTable.name}`;
}

function formatTemplate(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce((result, [key, value]) => result.replace(`{${key}}`, value), template);
}

function defaultMaxGeneralizationTolerance(srid: string) {
  return srid === "4326" ? "0.001" : undefined;
}

export default function App() {
  const [locale, setLocale] = useState<Locale>(getInitialLocale);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [geometryOnly, setGeometryOnly] = useState(false);
  const [error, setError] = useState("");
  const [state, setState] = useState<WizardState>({
    portalUrl: defaultPortal,
    portalFolders: [],
    workspaces: [],
    warehouses: [],
    catalogs: [],
    schemas: [],
    tables: [],
    columns: [],
    sampleRows: []
  });
  const text = translations[locale];

  const tableName = fullTableName(state);
  const config = useMemo<ServiceConfiguration | undefined>(() => {
    if (!state.selectedWorkspace || !state.selectedWarehouse || !tableName || !state.detection) return state.config;
    return {
      workspace: state.selectedWorkspace.id,
      warehouseId: state.selectedWarehouse.id,
      warehouseHttpPath: state.selectedWarehouse.httpPath,
      tableName,
      geometryColumn: state.detection.suggestedGeometryColumn ?? state.columns[0]?.name ?? "",
      idField: state.detection.suggestedIdField ?? "",
      geometryFormat: state.detection.suggestedGeometryFormat ?? "GEOMETRY",
      srid: state.detection.suggestedSrid,
      maxRecordCount: "2000",
      enableGeometryGeneralization: true,
      maxGeneralizationTolerance: defaultMaxGeneralizationTolerance(state.detection.suggestedSrid),
      queryCacheEnabled: false,
      queryCacheTtlSeconds: "300",
      queryCacheMaxEntries: "500",
      timeColumn: state.detection.timeCandidates[0]?.column,
      serviceName: state.selectedTable?.name.replace(/[^A-Za-z0-9_]/g, "_") ?? "",
      editable: false,
      ...state.config
    };
  }, [state, tableName]);

  async function run<T>(action: () => Promise<T>) {
    setBusy(true);
    setError("");
    try {
      return await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : text.errors.unexpected);
    } finally {
      setBusy(false);
    }
  }

  function changeLocale(nextLocale: Locale) {
    setLocale(nextLocale);
    localStorage.setItem("databricks-builder-locale", nextLocale);
  }

  async function handleSignIn() {
    await run(async () => {
      if (!clientId) throw new Error(text.errors.missingClientId);
      const session = await signIn(state.portalUrl, clientId);
      const [workspaces, portalFolders] = await Promise.all([
        api.workspaces(),
        api.portalFolders(session.token, state.portalUrl)
      ]);
      setState((current) => ({ ...current, portalToken: session.token, userName: session.userName, portalFolders, workspaces }));
      setStep(1);
    });
  }

  async function chooseWorkspace(workspaceId: string) {
    await run(async () => {
      if (!workspaceId) {
        setState((current) => ({
          ...current,
          selectedWorkspace: undefined,
          warehouses: [],
          selectedWarehouse: undefined,
          catalogs: [],
          schemas: [],
          tables: [],
          geometryScan: undefined
        }));
        return;
      }

      const selectedWorkspace = state.workspaces.find((workspace) => workspace.id === workspaceId);
      const warehouses = await api.warehouses(workspaceId);
      setState((current) => ({
        ...current,
        selectedWorkspace,
        warehouses,
        selectedWarehouse: warehouses.length === 1 ? warehouses[0] : undefined,
        catalogs: [],
        schemas: [],
        tables: [],
        geometryScan: undefined
      }));
    });
  }

  async function chooseWarehouse(warehouseId: string) {
    if (!warehouseId) {
      setState((current) => ({ ...current, selectedWarehouse: undefined, catalogs: [], schemas: [], tables: [], geometryScan: undefined }));
      return;
    }

    const selectedWarehouse = state.warehouses.find((warehouse) => warehouse.id === warehouseId);
    setState((current) => ({ ...current, selectedWarehouse, catalogs: [], schemas: [], tables: [], geometryScan: undefined }));
  }

  async function browseMetadata() {
    await run(async () => {
      if (!state.selectedWorkspace || !state.selectedWarehouse) return;
      const catalogs = await api.catalogs(state.selectedWorkspace.id, state.selectedWarehouse.id);
      setState((current) => ({ ...current, catalogs, schemas: [], tables: [], geometryScan: undefined }));
      setStep(2);
    });
  }

  async function chooseCatalog(catalog: string) {
    await run(async () => {
      if (!state.selectedWorkspace || !state.selectedWarehouse) return;
      const schemas = await api.schemas(state.selectedWorkspace.id, state.selectedWarehouse.id, catalog);
      setState((current) => ({ ...current, selectedCatalog: catalog, schemas, tables: [], selectedSchema: undefined, geometryScan: undefined }));
    });
  }

  async function chooseSchema(schema: string) {
    setGeometryOnly(false);
    await run(async () => {
      if (!state.selectedWorkspace || !state.selectedWarehouse || !state.selectedCatalog) return;
      const [tables, geometryScan] = await Promise.all([
        api.tables(state.selectedWorkspace.id, state.selectedWarehouse.id, state.selectedCatalog, schema),
        api.geometryScanCache(
          state.selectedWorkspace.id,
          state.selectedWarehouse.id,
          state.selectedCatalog,
          schema
        )
      ]);
      setState((current) => ({ ...current, selectedSchema: schema, tables, selectedTable: undefined, geometryScan: geometryScan ?? undefined }));
    });
  }

  async function scanGeometryTables() {
    await run(async () => {
      if (!state.selectedWorkspace || !state.selectedWarehouse || !state.selectedCatalog || !state.selectedSchema) return;
      const tableNames = state.tables.map((table) => table.name);
      const geometryScan = await api.geometryScan(
        state.selectedWorkspace.id,
        state.selectedWarehouse.id,
        state.selectedCatalog,
        state.selectedSchema,
        tableNames,
        Boolean(state.geometryScan)
      );
      setState((current) => ({ ...current, geometryScan }));
    });
  }

  async function chooseTable(table: TableInfo) {
    await run(async () => {
      if (!state.selectedWorkspace || !state.selectedWarehouse || !state.selectedCatalog || !state.selectedSchema) return;
      const fqtn = `${state.selectedCatalog}.${state.selectedSchema}.${table.name}`;
      const [columns, sampleRows, detection] = await Promise.all([
        api.describe(state.selectedWorkspace.id, state.selectedWarehouse.id, fqtn),
        api.sample(state.selectedWorkspace.id, state.selectedWarehouse.id, fqtn),
        api.detect(state.selectedWorkspace.id, state.selectedWarehouse.id, fqtn)
      ]);
      setState((current) => ({ ...current, selectedTable: table, columns, sampleRows, detection, objectIdSearch: undefined, config: undefined }));
      setStep(3);
    });
  }

  async function findObjectId() {
    if (!state.selectedWorkspace || !state.selectedWarehouse || !tableName) return;
    const workspaceId = state.selectedWorkspace.id;
    const warehouseId = state.selectedWarehouse.id;
    await run(async () => {
      const objectIdSearch = await api.findObjectId(workspaceId, warehouseId, tableName);
      setState((current) => ({
        ...current,
        objectIdSearch,
        validation: undefined,
        publishResult: undefined,
        config: objectIdSearch.selectedField
          ? { ...((current.config ?? config) as ServiceConfiguration), idField: objectIdSearch.selectedField }
          : current.config
      }));
    });
  }

  async function validate() {
    const configToValidate = state.config ?? config;
    if (!configToValidate) return;
    await run(async () => {
      const validation = await api.validate(configToValidate);
      setState((current) => ({ ...current, validation, config: configToValidate }));
      setStep(5);
    });
  }

  async function publish() {
    const configToPublish = state.config ?? config;
    if (!configToPublish || !state.portalToken) return;
    const portalToken = state.portalToken;
    setPublishing(true);
    try {
      await run(async () => {
        const publishResult = await api.publish(configToPublish, portalToken, state.portalUrl);
        setState((current) => ({ ...current, publishResult, config: configToPublish }));
        setStep(6);
      });
    } finally {
      setPublishing(false);
    }
  }

  function finishWizard() {
    setStep(0);
    setBusy(false);
    setPublishing(false);
    setGeometryOnly(false);
    setError("");
    setState({
      portalUrl: defaultPortal,
      portalFolders: [],
      workspaces: [],
      warehouses: [],
      catalogs: [],
      schemas: [],
      tables: [],
      columns: [],
      sampleRows: []
    });
  }

  function updateConfig(patch: Partial<ServiceConfiguration>) {
    setState((current) => ({
      ...current,
      validation: undefined,
      publishResult: undefined,
      config: { ...((current.config ?? config) as ServiceConfiguration), ...patch }
    }));
  }

  function translateWarning(warning: string) {
    if (warning === "No geometry column was detected. Select one manually before publishing.") return text.warnings.noGeometry;
    if (warning === "No strong object id candidate was detected. Choose a stable unique field.") return text.warnings.noObjectId;
    if (warning === "Large maxRecordCount values can make CDF queries slow.") return text.warnings.largeMaxRecordCount;

    const complexAttribute = warning.match(/^(.+) uses (.+); complex attribute types may not publish cleanly\.$/);
    if (complexAttribute) {
      return formatTemplate(text.warnings.complexAttribute, {
        name: complexAttribute[1],
        dataType: complexAttribute[2]
      });
    }

    return warning;
  }

  const selectedIdField = state.objectIdSearch?.selectedField ?? state.config?.idField ?? state.detection?.suggestedIdField;
  const validationParameters = state.validation?.serviceParameters;
  const selectedFolderTitle = config?.folderId
    ? state.portalFolders.find((folder) => folder.id === config.folderId)?.title
    : text.service.rootFolder;
  const geometryScanByTable = useMemo(() => {
    return new Map(state.geometryScan?.tables.map((table) => [table.name, table]) ?? []);
  }, [state.geometryScan]);
  const visibleTables = useMemo(() => {
    if (!geometryOnly) return state.tables;
    return state.tables.filter((table) => geometryScanByTable.get(table.name)?.hasGeometry);
  }, [geometryOnly, geometryScanByTable, state.tables]);

  return (
    <calcite-shell>
      <header className="app-header" slot="header">
        <div>
          <h1>{text.appTitle}</h1>
          <p>{text.appSubtitle}</p>
        </div>
        <div className="header-controls">
          <select
            aria-label={text.language}
            className="language-select"
            value={locale}
            onChange={(event) => changeLocale(event.target.value as Locale)}
          >
            {(Object.keys(localeLabels) as Locale[]).map((item) => (
              <option key={item} value={item}>{localeLabels[item]}</option>
            ))}
          </select>
          {state.userName && <calcite-chip icon="user">{state.userName}</calcite-chip>}
        </div>
      </header>
      <div className="layout">
        <StepRail current={step} steps={text.steps} />
        <main>
          {error && <calcite-alert open kind="danger" icon="exclamation-mark-triangle"><div slot="title">{text.actionFailedTitle}</div><div slot="message">{error}</div></calcite-alert>}
          {busy && <calcite-progress type="indeterminate" />}

          {step === 0 && (
            <section className="panel">
              <h2>{text.signIn.title}</h2>
              <label>{text.signIn.portalUrl}</label>
              <input
                className="text-input"
                value={state.portalUrl}
                onChange={(event) => setState({ ...state, portalUrl: event.target.value })}
              />
              <div className="actions">
                <calcite-button onClick={handleSignIn}>{text.signIn.button}</calcite-button>
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="panel">
              <h2>{text.connection.title}</h2>
              <div className="form-grid">
                <label>{text.connection.workspace}</label>
                <select className="text-input" value={state.selectedWorkspace?.id ?? ""} onChange={(event) => chooseWorkspace(event.target.value)}>
                  <option value="">{text.connection.chooseWorkspace}</option>
                  {state.workspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>{workspace.label}</option>
                  ))}
                </select>
                <label>{text.connection.warehouse}</label>
                <select className="text-input" value={state.selectedWarehouse?.id ?? ""} disabled={!state.selectedWorkspace} onChange={(event) => chooseWarehouse(event.target.value)}>
                  <option value="">{text.connection.chooseWarehouse}</option>
                  {state.warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                  ))}
                </select>
              </div>
              <div className="info-banner">
                {state.selectedWarehouse ? text.connection.ready : text.connection.chooseBoth}
              </div>
              <div className="actions">
                <button className="primary-button" disabled={!state.selectedWorkspace || !state.selectedWarehouse || busy} onClick={browseMetadata}>
                  {text.connection.browse}
                </button>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="panel wide">
              <h2>{text.browser.title}</h2>
              {state.selectedSchema && (
                <div className="browser-scan">
                  <div>
                    <strong>{text.browser.geometryScanTitle}</strong>
                    <p>
                      {state.geometryScan
                        ? formatTemplate(text.browser.geometryScanCached, {
                            date: new Date(state.geometryScan.scannedAt).toLocaleString(locale === "es" ? "es-ES" : "ca-ES")
                          })
                        : text.browser.geometryScanHelp}
                    </p>
                  </div>
                  <calcite-button appearance="outline" icon-start="search" {...calciteDisabled(busy)} onClick={scanGeometryTables}>
                    {state.geometryScan ? text.browser.refreshGeometryScan : text.browser.runGeometryScan}
                  </calcite-button>
                </div>
              )}
              <div className="browser">
                <DataList
                  title={text.browser.catalogs}
                  items={state.catalogs}
                  selected={state.selectedCatalog}
                  getKey={(item) => item}
                  render={(item) => item}
                  onSelect={chooseCatalog}
                  searchPlaceholder={text.browser.search}
                  filterLabel={text.browser.filterLabel}
                  emptyMessage={text.browser.noMatches}
                />
                <DataList
                  title={text.browser.schemas}
                  items={state.schemas}
                  selected={state.selectedSchema}
                  getKey={(item) => item}
                  render={(item) => item}
                  onSelect={chooseSchema}
                  searchPlaceholder={text.browser.search}
                  filterLabel={text.browser.filterLabel}
                  emptyMessage={text.browser.noMatches}
                />
                <DataList
                  title={text.browser.tables}
                  items={visibleTables}
                  selected={state.selectedTable?.name}
                  getKey={(item) => item.name}
                  headerAction={(
                    <label className="geometry-filter">
                      <input
                        checked={geometryOnly}
                        disabled={!state.geometryScan}
                        type="checkbox"
                        onChange={(event) => setGeometryOnly(event.target.checked)}
                      />
                      {text.browser.geometryOnly}
                    </label>
                  )}
                  render={(item) => {
                    const scan = geometryScanByTable.get(item.name);
                    return (
                      <>
                        <span className="table-name">{item.name}</span>
                        <span className="table-badges">
                          {scan?.hasGeometry && <small className="geometry-badge">{text.browser.geometryBadge}</small>}
                          {scan && !scan.hasGeometry && scan.candidates.length > 0 && <small>{text.browser.reviewBadge}</small>}
                          <small>{item.type}</small>
                        </span>
                      </>
                    );
                  }}
                  onSelect={chooseTable}
                  searchPlaceholder={text.browser.search}
                  filterLabel={text.browser.filterLabel}
                  emptyMessage={text.browser.noMatches}
                />
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="panel wide">
              <h2>{text.schema.title}</h2>
              <div className="summary">
                <strong>{tableName}</strong>
                <span>{state.columns.length} {text.schema.columnsCount}</span>
                {state.detection?.geometryType && <span>{state.detection.geometryType}</span>}
              </div>
              <div className="grid-table">
                <div>{text.schema.headers.name}</div><div>{text.schema.headers.type}</div><div>{text.schema.headers.role}</div><div>{text.schema.headers.sample}</div>
                {state.columns.map((column) => (
                  <div className="row" key={column.name}>
                    <div>{column.name}</div>
                    <div>{column.dataType}</div>
                    <div>{state.detection?.suggestedGeometryColumn === column.name ? text.schema.roles.geometry : selectedIdField === column.name ? text.schema.roles.id : state.detection?.timeCandidates.some((candidate) => candidate.column === column.name) ? text.schema.roles.time : text.schema.roles.attribute}</div>
                    <div>{String(state.sampleRows[0]?.[column.name] ?? "")}</div>
                  </div>
                ))}
              </div>
              {state.detection?.warnings && state.detection.warnings.length > 0 && (
                <div className="notice-stack">
                  {state.detection.warnings.map((warning) => (
                    <div className="content-notice warning" key={warning}>
                      {translateWarning(warning)}
                    </div>
                  ))}
                </div>
              )}
              <div className="object-id-search">
                <div>
                  <strong>{text.schema.findObjectId}</strong>
                  <p>{text.schema.objectIdSearchHelp}</p>
                </div>
                <calcite-button appearance="outline" icon-start="search" onClick={findObjectId}>{text.schema.findObjectId}</calcite-button>
              </div>
              {state.objectIdSearch?.selectedField && (
                <calcite-notice open kind="success" icon="check-circle">
                  <div slot="message">{text.schema.objectIdSelected}: {state.objectIdSearch.selectedField}</div>
                </calcite-notice>
              )}
              {state.objectIdSearch && !state.objectIdSearch.selectedField && (
                <calcite-notice open kind="warning">
                  <div slot="message">{text.schema.objectIdNoValid}</div>
                </calcite-notice>
              )}
              {state.objectIdSearch && state.objectIdSearch.checkedCandidates.length > 0 && (
                <div className="candidate-summary">
                  <strong>{text.schema.objectIdChecked}</strong>
                  <div>
                    {state.objectIdSearch.checkedCandidates.map((candidate) => (
                      <span className={candidate.valid ? "candidate valid" : "candidate"} key={candidate.column}>
                        {candidate.column} · {candidate.valid ? text.schema.valid : text.schema.invalid}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="actions">
                <calcite-button appearance="outline" onClick={() => setStep(2)}>{text.actions.back}</calcite-button>
                <calcite-button icon-start="sliders-horizontal" onClick={() => setStep(4)}>{text.schema.configure}</calcite-button>
              </div>
            </section>
          )}

          {step === 4 && config && (
            <section className="panel">
              <h2>{text.service.title}</h2>
              <div className="form-grid">
                <label>{text.service.serviceName}</label>
                <input
                  className="text-input"
                  value={config.serviceName}
                  onChange={(event) => updateConfig({ serviceName: event.target.value })}
                />
                <label>{text.service.portalFolder}</label>
                <calcite-select value={config.folderId ?? ""} onCalciteSelectChange={(event: any) => updateConfig({ folderId: event.target.value || undefined })}>
                  <calcite-option value="">{text.service.rootFolder}</calcite-option>
                  {state.portalFolders.map((folder) => <calcite-option key={folder.id} value={folder.id}>{folder.title}</calcite-option>)}
                </calcite-select>
                <label>{text.service.geometryColumn}</label>
                <calcite-select value={config.geometryColumn} onCalciteSelectChange={(event: any) => updateConfig({ geometryColumn: event.target.value })}>
                  {state.columns.map((column) => <calcite-option key={column.name} value={column.name}>{column.name}</calcite-option>)}
                </calcite-select>
                <label>{text.service.geometryFormat}</label>
                <calcite-select value={config.geometryFormat} onCalciteSelectChange={(event: any) => updateConfig({ geometryFormat: event.target.value })}>
                  {geometryFormats.map((format) => <calcite-option key={format} value={format}>{format}</calcite-option>)}
                </calcite-select>
                <label>{text.service.idField}</label>
                <calcite-select value={config.idField} onCalciteSelectChange={(event: any) => updateConfig({ idField: event.target.value })}>
                  <calcite-option value="">{text.service.chooseIdField}</calcite-option>
                  {state.columns.map((column) => <calcite-option key={column.name} value={column.name}>{column.name}</calcite-option>)}
                </calcite-select>
                <label>{text.service.srid}</label>
                <calcite-input value={config.srid} onCalciteInputInput={(event: any) => updateConfig({ srid: event.target.value })} />
                <label>{text.service.maxRecordCount}</label>
                <calcite-input value={config.maxRecordCount} onCalciteInputInput={(event: any) => updateConfig({ maxRecordCount: event.target.value })} />
                <label>{text.service.geometryGeneralization}</label>
                <label className="inline-check">
                  <input
                    checked={config.enableGeometryGeneralization !== false}
                    type="checkbox"
                    onChange={(event) => updateConfig({ enableGeometryGeneralization: event.target.checked })}
                  />
                  {text.service.enabled}
                </label>
                <label>{text.service.minGeneralizationTolerance}</label>
                <calcite-input
                  placeholder={text.service.optional}
                  value={config.minGeneralizationTolerance ?? ""}
                  onCalciteInputInput={(event: any) => updateConfig({ minGeneralizationTolerance: event.target.value || undefined })}
                />
                <label>{text.service.maxGeneralizationTolerance}</label>
                <calcite-input
                  placeholder={text.service.optional}
                  value={config.maxGeneralizationTolerance ?? ""}
                  onCalciteInputInput={(event: any) => updateConfig({ maxGeneralizationTolerance: event.target.value || undefined })}
                />
                <label>{text.service.queryCache}</label>
                <label className="inline-check">
                  <input
                    checked={config.queryCacheEnabled === true}
                    type="checkbox"
                    onChange={(event) => updateConfig({ queryCacheEnabled: event.target.checked })}
                  />
                  {text.service.enabled}
                </label>
                <label>{text.service.queryCacheTtlSeconds}</label>
                <calcite-input
                  value={config.queryCacheTtlSeconds ?? ""}
                  onCalciteInputInput={(event: any) => updateConfig({ queryCacheTtlSeconds: event.target.value || undefined })}
                />
                <label>{text.service.queryCacheMaxEntries}</label>
                <calcite-input
                  value={config.queryCacheMaxEntries ?? ""}
                  onCalciteInputInput={(event: any) => updateConfig({ queryCacheMaxEntries: event.target.value || undefined })}
                />
                <label>{text.service.timeColumn}</label>
                <calcite-select value={config.timeColumn ?? ""} onCalciteSelectChange={(event: any) => updateConfig({ timeColumn: event.target.value || undefined })}>
                  <calcite-option value="">{text.service.none}</calcite-option>
                  {state.columns.map((column) => <calcite-option key={column.name} value={column.name}>{column.name}</calcite-option>)}
                </calcite-select>
              </div>
              <calcite-block heading={text.service.advanced} collapsible>
                <calcite-text-area placeholder='{"customParameter":"value"}' onCalciteTextAreaInput={(event: any) => {
                  try { updateConfig({ advancedParameters: event.target.value ? JSON.parse(event.target.value) : undefined }); } catch { setError(text.errors.invalidAdvancedJson); }
                }} />
              </calcite-block>
              <div className="actions">
                <calcite-button appearance="outline" onClick={() => setStep(3)}>{text.actions.back}</calcite-button>
                <calcite-button icon-start="check-circle" onClick={validate}>{text.validation.validate}</calcite-button>
              </div>
            </section>
          )}

          {step === 5 && (
            <section className="panel wide">
              <h2>{text.validation.title}</h2>
              {((state.validation?.warnings.length ?? 0) > 0 || (state.validation?.errors.length ?? 0) > 0) && (
                <div className="notice-stack">
                  {state.validation?.warnings.map((warning) => (
                    <div className="content-notice warning" key={warning}>
                      {translateWarning(warning)}
                    </div>
                  ))}
                  {state.validation?.errors.map((item) => (
                    <div className="content-notice danger" key={item}>
                      {item}
                    </div>
                  ))}
                </div>
              )}
              {validationParameters && (
                <div className="validation-summary">
                  <dl>
                    <div><dt>{text.validation.serviceName}</dt><dd>{state.config?.serviceName ?? config?.serviceName}</dd></div>
                    <div><dt>{text.validation.portal}</dt><dd>{state.portalUrl}</dd></div>
                    <div><dt>{text.validation.portalFolder}</dt><dd>{selectedFolderTitle}</dd></div>
                    {state.userName && <div><dt>{text.validation.user}</dt><dd>{state.userName}</dd></div>}
                    <div><dt>{text.validation.workspace}</dt><dd>{validationParameters.workspace}</dd></div>
                    <div><dt>{text.validation.warehouseHttpPath}</dt><dd>{validationParameters.warehouseHttpPath}</dd></div>
                    <div><dt>{text.validation.table}</dt><dd>{validationParameters.tableName}</dd></div>
                    <div><dt>{text.validation.columns}</dt><dd>{state.columns.length}</dd></div>
                    <div><dt>{text.validation.geometry}</dt><dd>{validationParameters.geometryColumn}</dd></div>
                    {state.detection?.geometryType && <div><dt>{text.validation.geometryType}</dt><dd>{state.detection.geometryType}</dd></div>}
                    <div><dt>{text.validation.objectId}</dt><dd>{validationParameters.idField}</dd></div>
                    <div><dt>{text.validation.format}</dt><dd>{validationParameters.geometryFormat}</dd></div>
                    <div><dt>SRID</dt><dd>{validationParameters.srid}</dd></div>
                    <div><dt>{text.validation.maxRecords}</dt><dd>{validationParameters.maxRecordCount}</dd></div>
                    <div><dt>{text.validation.geometryGeneralization}</dt><dd>{validationParameters.enableGeometryGeneralization === "true" ? text.validation.yes : text.validation.no}</dd></div>
                    {validationParameters.minGeneralizationTolerance && <div><dt>{text.validation.minGeneralizationTolerance}</dt><dd>{validationParameters.minGeneralizationTolerance}</dd></div>}
                    {validationParameters.maxGeneralizationTolerance && <div><dt>{text.validation.maxGeneralizationTolerance}</dt><dd>{validationParameters.maxGeneralizationTolerance}</dd></div>}
                    <div><dt>{text.validation.queryCache}</dt><dd>{validationParameters.queryCacheEnabled === "true" ? text.validation.yes : text.validation.no}</dd></div>
                    {validationParameters.queryCacheTtlSeconds && <div><dt>{text.validation.queryCacheTtlSeconds}</dt><dd>{validationParameters.queryCacheTtlSeconds}</dd></div>}
                    {validationParameters.queryCacheMaxEntries && <div><dt>{text.validation.queryCacheMaxEntries}</dt><dd>{validationParameters.queryCacheMaxEntries}</dd></div>}
                    {validationParameters.timeColumn && <div><dt>{text.validation.timeColumn}</dt><dd>{validationParameters.timeColumn}</dd></div>}
                    <div><dt>{text.validation.editable}</dt><dd>{validationParameters.editingEnabled === "true" ? text.validation.yes : text.validation.no}</dd></div>
                  </dl>
                </div>
              )}
              {publishing && (
                <div className="publish-progress">
                  <calcite-progress type="indeterminate" />
                  <span>{text.validation.publishing}</span>
                </div>
              )}
              <div className="actions">
                <calcite-button appearance="outline" {...calciteDisabled(busy)} onClick={() => setStep(4)}>{text.actions.back}</calcite-button>
                <calcite-button icon-start="upload-to" {...calciteDisabled(!state.validation?.ok || busy)} onClick={publish}>{text.validation.confirmPublish}</calcite-button>
              </div>
            </section>
          )}

          {step === 6 && (
            <section className="panel">
              <h2>{text.result.title}</h2>
              {state.publishResult?.ok ? (
                <div className="result-links">
                  <calcite-notice open kind="success" icon="check-circle"><div slot="message">{text.result.success}</div></calcite-notice>
                  {state.publishResult.itemUrl && <calcite-link href={state.publishResult.itemUrl} target="_blank">{text.result.openItem}</calcite-link>}
                  {state.publishResult.mapViewerUrl && <calcite-link href={state.publishResult.mapViewerUrl} target="_blank">{text.result.openMapViewer}</calcite-link>}
                  {state.publishResult.restUrl && (
                    <>
                      <calcite-link href={state.publishResult.restUrl} target="_blank">{text.result.openRest}</calcite-link>
                      <calcite-input read-only value={state.publishResult.restUrl} />
                    </>
                  )}
                  <div className="actions">
                    <calcite-button icon-start="check-circle" onClick={finishWizard}>{text.actions.finish}</calcite-button>
                  </div>
                </div>
              ) : (
                <>
                  {state.publishResult?.warnings.map((item) => <calcite-notice key={item} open kind="warning"><div slot="message">{item}</div></calcite-notice>)}
                  {state.publishResult?.errors.map((item) => <calcite-notice key={item} open kind="danger"><div slot="message">{item}</div></calcite-notice>)}
                  <div className="actions">
                    <calcite-button appearance="outline" onClick={() => setStep(4)}>{text.result.changeServiceName}</calcite-button>
                  </div>
                </>
              )}
            </section>
          )}
        </main>
      </div>
    </calcite-shell>
  );
}
