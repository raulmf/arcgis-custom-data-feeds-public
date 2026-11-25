# ArcGIS Custom Data Feeds — Architecture and Codex Portfolio

A collection of projects exploring ArcGIS Enterprise Custom Data Feeds and integrations with external data platforms. This repository showcases my architecture decisions and practical experience directing AI-assisted development with **OpenAI Codex**.

This work is based on [anandtrivedi/esri-customdatafeed](https://github.com/anandtrivedi/esri-customdatafeed). Credit goes to that repository for the original foundation; this portfolio documents my adaptations and extensions developed with Codex.

## How these projects are built

**All custom project code in this repository is produced through vibe coding with Codex.** I define the goals, guide the architecture and integration choices, and steer implementation through prompts, feedback, and iteration. Codex generates the implementation under that direction.

The portfolio demonstrates turning requirements into working integrations through this development process. Bundled frameworks, generated scaffolding, and third-party dependencies retain their original authorship and licenses; the statement above describes the custom development work.

## Project documentation

- [Databricks Provider](databricks-provider/README.md): a CDF provider connecting ArcGIS FeatureServer services to Databricks SQL and Lakebase, with separate paths for read-only queries and editable data.

Individual project READMEs explain the architecture, configuration, and implementation details. These projects are portfolio work; their presence here does not by itself establish production readiness.
