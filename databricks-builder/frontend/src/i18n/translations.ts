export type Locale = "ca" | "es";

export const localeLabels: Record<Locale, string> = {
  ca: "Català",
  es: "Español"
};

export const translations = {
  ca: {
    appTitle: "Constructor de serveis espacials Databricks per a ArcGIS",
    appSubtitle: "Publica serveis d'entitats Custom Data Feed des de taules espacials governades de Databricks.",
    language: "Idioma",
    actionFailedTitle: "L'acció ha fallat",
    steps: ["Inici de sessió", "Connexió", "Explorador de dades", "Revisió de l'esquema", "Configuració del servei", "Resum", "Resultat de publicació"],
    signIn: {
      title: "Inici de sessió",
      portalUrl: "URL del Portal",
      button: "Inicia sessió amb ArcGIS Portal"
    },
    connection: {
      title: "Connexió",
      workspace: "Espai de treball Databricks",
      warehouse: "SQL warehouse",
      chooseWorkspace: "Tria un espai de treball",
      chooseWarehouse: "Tria un SQL warehouse",
      ready: "Tot a punt per explorar les metadades de Databricks.",
      chooseBoth: "Tria un espai de treball i un warehouse per explorar les metadades.",
      browse: "Explora metadades"
    },
    browser: {
      title: "Explorador de dades",
      catalogs: "Catàlegs",
      schemas: "Esquemes",
      tables: "Taules i vistes",
      search: "Cerca",
      filterLabel: "Filtra",
      noMatches: "Cap coincidència",
      geometryScanTitle: "Taules i vistes amb geometria",
      geometryScanHelp: "No s'executa automàticament. Fes servir el botó per buscar possibles columnes de geometria en aquest esquema i desar el resultat localment.",
      geometryScanCached: "Resultat carregat de la cache local. Últim escaneig: {date}.",
      runGeometryScan: "Buscar geometries",
      refreshGeometryScan: "Actualitzar cerca",
      geometryOnly: "Mostra només amb geometria",
      geometryBadge: "Geometria",
      reviewBadge: "Revisar"
    },
    schema: {
      title: "Revisió de l'esquema",
      columnsCount: "columnes",
      headers: {
        name: "Nom",
        type: "Tipus",
        role: "Rol probable",
        sample: "Mostra"
      },
      roles: {
        geometry: "geometria",
        id: "identificador",
        time: "temps",
        attribute: "atribut"
      },
      configure: "Configura el servei",
      findObjectId: "Busca un camp ObjectID vàlid",
      objectIdSearchHelp: "Analitza camps candidats string/integer per trobar valors únics i no nuls. Pot trigar en taules grans. Alternativament, mitjançant el botó inferior \"Configura el servei\", pots seleccionar manualment el camp per a l'ObjectID.",
      objectIdSelected: "Camp ObjectID seleccionat",
      objectIdNoValid: "No s'ha trobat cap camp ObjectID vàlid entre els candidats analitzats.",
      objectIdChecked: "Candidats analitzats",
      valid: "vàlid",
      invalid: "no vàlid"
    },
    service: {
      title: "Configuració del servei",
      serviceName: "Nom del servei",
      portalFolder: "Carpeta del Portal",
      rootFolder: "Carpeta arrel",
      geometryColumn: "Columna de geometria",
      geometryFormat: "Format de geometria",
      idField: "Camp Object ID",
      chooseIdField: "Tria un camp ObjectID",
      srid: "SRID",
      maxRecordCount: "Nombre màxim de registres",
      geometryGeneralization: "Generalització de geometria",
      enabled: "Activada",
      minGeneralizationTolerance: "Tolerància mínima",
      maxGeneralizationTolerance: "Tolerància màxima",
      queryCache: "Cache de consultes",
      queryCacheTtlSeconds: "Temps de cache (segons)",
      queryCacheMaxEntries: "Entrades màximes de cache",
      optional: "Opcional",
      timeColumn: "Columna temporal",
      none: "Cap",
      advanced: "Paràmetres CDF avançats"
    },
    validation: {
      title: "Resum",
      validate: "Valida",
      confirmPublish: "Crea el servei",
      publishing: "S'està creant el servei...",
      summary: "Resum del servei",
      serviceName: "Nom del servei",
      portal: "Portal",
      portalFolder: "Carpeta del Portal",
      user: "Usuari",
      workspace: "Workspace",
      warehouseHttpPath: "Ruta HTTP del warehouse",
      table: "Taula",
      columns: "Columnes",
      geometry: "Geometria",
      geometryType: "Tipus de geometria",
      objectId: "ObjectID",
      format: "Format",
      maxRecords: "Màxim de registres",
      geometryGeneralization: "Generalització de geometria",
      minGeneralizationTolerance: "Tolerància mínima",
      maxGeneralizationTolerance: "Tolerància màxima",
      queryCache: "Cache de consultes",
      queryCacheTtlSeconds: "Temps de cache (segons)",
      queryCacheMaxEntries: "Entrades màximes de cache",
      timeColumn: "Columna temporal",
      editable: "Editable",
      yes: "Sí",
      no: "No"
    },
    result: {
      title: "Resultat de publicació",
      success: "El Feature Service s'ha creat correctament.",
      openItem: "Obre l'element Feature Layer al Portal",
      openMapViewer: "Obre al Map Viewer",
      openRest: "Obre l'endpoint REST d'ArcGIS Server",
      changeServiceName: "Canvia el nom del servei"
    },
    actions: {
      back: "Enrere",
      finish: "Finalitza"
    },
    errors: {
      unexpected: "Error inesperat",
      missingClientId: "VITE_ARCGIS_CLIENT_ID és obligatori per a l'OAuth del Portal.",
      invalidAdvancedJson: "Els paràmetres avançats han de ser JSON vàlid."
    },
    warnings: {
      noGeometry: "No s'ha detectat cap columna de geometria. Selecciona'n una manualment abans de publicar.",
      noObjectId: "No s'ha detectat cap candidat clar per a l'Object ID. Tria un camp únic i estable. El camp idField hauria de ser de tipus string, recomanat i el més habitual. També s'admet integer si els valors són únics i estables. Els requisits clau són més importants que el tipus exacte: tots els valors han de ser únics, estables entre actualitzacions i no poden ser nuls.",
      largeMaxRecordCount: "Els valors alts de nombre màxim de registres poden alentir les consultes CDF.",
      complexAttribute: "{name} fa servir {dataType}; els tipus d'atribut complexos poden no publicar-se correctament."
    }
  },
  es: {
    appTitle: "Constructor de servicios espaciales Databricks para ArcGIS",
    appSubtitle: "Publica servicios de entidades Custom Data Feed desde tablas espaciales gobernadas de Databricks.",
    language: "Idioma",
    actionFailedTitle: "La acción ha fallado",
    steps: ["Inicio de sesión", "Conexión", "Explorador de datos", "Revisión del esquema", "Configuración del servicio", "Resumen", "Resultado de publicación"],
    signIn: {
      title: "Inicio de sesión",
      portalUrl: "URL del Portal",
      button: "Iniciar sesión con ArcGIS Portal"
    },
    connection: {
      title: "Conexión",
      workspace: "Espacio de trabajo Databricks",
      warehouse: "SQL warehouse",
      chooseWorkspace: "Elige un espacio de trabajo",
      chooseWarehouse: "Elige un SQL warehouse",
      ready: "Todo listo para explorar los metadatos de Databricks.",
      chooseBoth: "Elige un espacio de trabajo y un warehouse para explorar los metadatos.",
      browse: "Explorar metadatos"
    },
    browser: {
      title: "Explorador de datos",
      catalogs: "Catálogos",
      schemas: "Esquemas",
      tables: "Tablas y vistas",
      search: "Buscar",
      filterLabel: "Filtrar",
      noMatches: "Sin coincidencias",
      geometryScanTitle: "Tablas y vistas con geometría",
      geometryScanHelp: "No se ejecuta automáticamente. Usa el botón para buscar posibles columnas de geometría en este esquema y guardar el resultado localmente.",
      geometryScanCached: "Resultado cargado de la cache local. Último escaneo: {date}.",
      runGeometryScan: "Buscar geometrías",
      refreshGeometryScan: "Actualizar búsqueda",
      geometryOnly: "Mostrar solo con geometría",
      geometryBadge: "Geometría",
      reviewBadge: "Revisar"
    },
    schema: {
      title: "Revisión del esquema",
      columnsCount: "columnas",
      headers: {
        name: "Nombre",
        type: "Tipo",
        role: "Rol probable",
        sample: "Muestra"
      },
      roles: {
        geometry: "geometría",
        id: "identificador",
        time: "tiempo",
        attribute: "atributo"
      },
      configure: "Configurar servicio",
      findObjectId: "Buscar campo ObjectID válido",
      objectIdSearchHelp: "Analiza campos candidatos string/integer para encontrar valores únicos y no nulos. Puede tardar en tablas grandes. Alternativamente, mediante el botón inferior \"Configurar servicio\" puede seleccionar manualmente el campo para el ObjectID.",
      objectIdSelected: "Campo ObjectID seleccionado",
      objectIdNoValid: "No se ha encontrado un campo ObjectID válido entre los candidatos analizados.",
      objectIdChecked: "Candidatos analizados",
      valid: "válido",
      invalid: "no válido"
    },
    service: {
      title: "Configuración del servicio",
      serviceName: "Nombre del servicio",
      portalFolder: "Carpeta del Portal",
      rootFolder: "Carpeta raíz",
      geometryColumn: "Columna de geometría",
      geometryFormat: "Formato de geometría",
      idField: "Campo Object ID",
      chooseIdField: "Elige un campo ObjectID",
      srid: "SRID",
      maxRecordCount: "Número máximo de registros",
      geometryGeneralization: "Generalización de geometría",
      enabled: "Activada",
      minGeneralizationTolerance: "Tolerancia mínima",
      maxGeneralizationTolerance: "Tolerancia máxima",
      queryCache: "Caché de consultas",
      queryCacheTtlSeconds: "Tiempo de caché (segundos)",
      queryCacheMaxEntries: "Entradas máximas de caché",
      optional: "Opcional",
      timeColumn: "Columna temporal",
      none: "Ninguna",
      advanced: "Parámetros CDF avanzados"
    },
    validation: {
      title: "Resumen",
      validate: "Validar",
      confirmPublish: "Crear servicio",
      publishing: "Creando el servicio...",
      summary: "Resumen del servicio",
      serviceName: "Nombre del servicio",
      portal: "Portal",
      portalFolder: "Carpeta del Portal",
      user: "Usuario",
      workspace: "Workspace",
      warehouseHttpPath: "Ruta HTTP del warehouse",
      table: "Tabla",
      columns: "Columnas",
      geometry: "Geometría",
      geometryType: "Tipo de geometría",
      objectId: "ObjectID",
      format: "Formato",
      maxRecords: "Máx. registros",
      geometryGeneralization: "Generalización de geometría",
      minGeneralizationTolerance: "Tolerancia mínima",
      maxGeneralizationTolerance: "Tolerancia máxima",
      queryCache: "Caché de consultas",
      queryCacheTtlSeconds: "Tiempo de caché (segundos)",
      queryCacheMaxEntries: "Entradas máximas de caché",
      timeColumn: "Columna temporal",
      editable: "Editable",
      yes: "Sí",
      no: "No"
    },
    result: {
      title: "Resultado de publicación",
      success: "El Feature Service se ha creado correctamente.",
      openItem: "Abrir el elemento Feature Layer en Portal",
      openMapViewer: "Abrir en Map Viewer",
      openRest: "Abrir el endpoint REST de ArcGIS Server",
      changeServiceName: "Cambiar el nombre del servicio"
    },
    actions: {
      back: "Atrás",
      finish: "Finalizar"
    },
    errors: {
      unexpected: "Error inesperado",
      missingClientId: "VITE_ARCGIS_CLIENT_ID es obligatorio para el OAuth del Portal.",
      invalidAdvancedJson: "Los parámetros avanzados deben ser JSON válido."
    },
    warnings: {
      noGeometry: "No se ha detectado ninguna columna de geometría. Selecciona una manualmente antes de publicar.",
      noObjectId: "No se ha detectado un candidato claro para ObjectID.  El campo deberá ser de tipo string, recomendado y el más habitual. También se admite integer. Los requisitos clave son más importantes que el tipo exacto: todos los valores deben ser únicos, estables entre actualizaciones y no pueden ser nulos.",
      largeMaxRecordCount: "Los valores altos de número máximo de registros pueden ralentizar las consultas CDF.",
      complexAttribute: "{name} usa {dataType}; los tipos de atributo complejos pueden no publicarse correctamente."
    }
  }
} as const;
