# 📘 Changelog - Tech Mahindra Project

Cambios relevantes del proyecto siguiendo Semantic Versioning.


# [1.1.0](https://github.com/Agentex9/Tech_Mahindra_Project/compare/v1.0.4...v1.1.0) (2026-04-17)


* **General:** Merge pull request #39 from Agentex9/dev ([](https://github.com/Agentex9/Tech_Mahindra_Project/commit/e5b93e610a7f0cd70e006efc971cc6d64e578327)), closes [#39](https://github.com/Agentex9/Tech_Mahindra_Project/issues/39)


### feat

* **Interfaz:** add first frontend mockup ([](https://github.com/Agentex9/Tech_Mahindra_Project/commit/a315c4e5e16d5a7815e8c3a3b7ffee882be7fed3))

## [1.0.4](https://github.com/Agentex9/Tech_Mahindra_Project/compare/v1.0.3...v1.0.4) (2026-04-09)


* **General:** Merge pull request #37 from Agentex9/3-gestión-de-sesión ([](https://github.com/Agentex9/Tech_Mahindra_Project/commit/0d683dadf1d111950d21940c5b7c340003a5ea1b)), closes [#37](https://github.com/Agentex9/Tech_Mahindra_Project/issues/37)
* **General:** Merge pull request #38 from Agentex9/dev ([](https://github.com/Agentex9/Tech_Mahindra_Project/commit/7bc3b366dd1382b252dd177c53b5ff18a61c41ac)), closes [#38](https://github.com/Agentex9/Tech_Mahindra_Project/issues/38)


### security

* **Autenticacion:** modify session limits ([](https://github.com/Agentex9/Tech_Mahindra_Project/commit/0fec8c3eb1f63922a534bc991c8556ec5a1736a0))

## [1.0.3](https://github.com/Agentex9/Tech_Mahindra_Project/compare/v1.0.2...v1.0.3) (2026-04-08)


* **General:** Merge pull request #36 from Agentex9/2-login ([](https://github.com/Agentex9/Tech_Mahindra_Project/commit/4eb0ce887b1bf863078afd6ffef23de5aef74da4)), closes [#36](https://github.com/Agentex9/Tech_Mahindra_Project/issues/36)


### security

* **Autenticacion:** add django-knox token auth system ([](https://github.com/Agentex9/Tech_Mahindra_Project/commit/17bfabf064c757dd8b829d5c0d85caa239eade07))

## [1.0.2](https://github.com/Agentex9/Tech_Mahindra_Project/compare/v1.0.1...v1.0.2) (2026-04-08)


* **General:** Merge pull request #35 from Agentex9/dev ([](https://github.com/Agentex9/Tech_Mahindra_Project/commit/4c153e2f1d74e814db43bedaf693375e84a4cc69)), closes [#35](https://github.com/Agentex9/Tech_Mahindra_Project/issues/35)


### chore

* **Base de Datos:** creation of models for all related subjects to users and transactions ([](https://github.com/Agentex9/Tech_Mahindra_Project/commit/81797e86025dfa588ff245fcf28ff62f91596ebe))


### fix

* **Base de Datos:** change casacade to null ([](https://github.com/Agentex9/Tech_Mahindra_Project/commit/530a2d54948db15540416361e23f113a49b80bb1))
* **Base de Datos:** fix field in transactions to use fk (issue_id) ([](https://github.com/Agentex9/Tech_Mahindra_Project/commit/82a041fd7a592d5d59629e3c459cbe1b52921534))
* **Base de Datos:** update project models, use abstractuser, switch pk to uuid, fix fks ([](https://github.com/Agentex9/Tech_Mahindra_Project/commit/29326870eb32fb5030dfe995e9bfa539e6302bda))

## [1.0.1](https://github.com/Agentex9/Tech_Mahindra_Project/compare/v1.0.0...v1.0.1) (2026-04-07)


* **General:** Merge pull request #33 from Agentex9/dev ([](https://github.com/Agentex9/Tech_Mahindra_Project/commit/f4baa3ebb87bd1fedc78f77b9c113b93731878b1)), closes [#33](https://github.com/Agentex9/Tech_Mahindra_Project/issues/33)
* **General:** Merge pull request #34 from Agentex9/dev ([](https://github.com/Agentex9/Tech_Mahindra_Project/commit/36cf74c96438bed278b3bfde74b088fb99ad131f)), closes [#34](https://github.com/Agentex9/Tech_Mahindra_Project/issues/34)


### chore

* **Base de Datos:** creation of models for all related subjects to projects and issues ([](https://github.com/Agentex9/Tech_Mahindra_Project/commit/b7782c5bea38230556907db9f2e3bde8ac117a3a))
* **Docker:** add postgresql db on docker ([](https://github.com/Agentex9/Tech_Mahindra_Project/commit/f5384756cb57d736373736fed985b619f71a2695))


### fix

* **Base de Datos:** added goals to sprints table ([](https://github.com/Agentex9/Tech_Mahindra_Project/commit/57f30e291bd64f231cf50d8f42cceb08fe685c2a))
* **Base de Datos:** changed functions from save to clean ([](https://github.com/Agentex9/Tech_Mahindra_Project/commit/e47964d801a50a23eda70e9c5df98fd3fc0b4995))
* **Base de Datos:** changed issues table name to match naming convension ([](https://github.com/Agentex9/Tech_Mahindra_Project/commit/f5b436389d47fe8c54081e1052c772aceeaeef39))
* **Base de Datos:** changed to correct naming convension and moved choices ([](https://github.com/Agentex9/Tech_Mahindra_Project/commit/eea02c38922e983c47d7c1e3edc947efa7761860))
* **Base de Datos:** comment fix ([](https://github.com/Agentex9/Tech_Mahindra_Project/commit/55c73f209fef1bc5a65bc141606630725b32e00b))
* **Base de Datos:** deleted redundant field bid date ([](https://github.com/Agentex9/Tech_Mahindra_Project/commit/9f517cc163eb910b49bbe21124248e92e7d78b75))
* **Base de Datos:** update paths for static files to use saved ([](https://github.com/Agentex9/Tech_Mahindra_Project/commit/16f611577c7e0ddc495294eed5e5fc9421d56696))
* **Configuracion:** added projects app to the settings file ([](https://github.com/Agentex9/Tech_Mahindra_Project/commit/36a9c4669d2d98f4732c43e5db0dd5f3edfa1d85))


### style

* **Release:** modify changelog desing ([](https://github.com/Agentex9/Tech_Mahindra_Project/commit/51a9600cac9c6a7bc6d2fc2415d13d03f105aabd))

# Changelog - Tech Mahindra Project

Todos los cambios relevantes del proyecto se documentan aqui siguiendo Semantic Versioning.


# 1.0.0 (2026-03-26)


* **General:** Merge pull request #31 from Agentex9/dev ([](https://github.com/Agentex9/Tech_Mahindra_Project/commit/7c9c51f1b23b8d19ebdef02480086c90b5646946)), closes [#31](https://github.com/Agentex9/Tech_Mahindra_Project/issues/31)
* **General:** Merge pull request #32 from Agentex9/dev ([](https://github.com/Agentex9/Tech_Mahindra_Project/commit/4ed54f769685cceec41ef76ecda667b424f532e5)), closes [#32](https://github.com/Agentex9/Tech_Mahindra_Project/issues/32)


### chore

* **CI/CD:** limit branch scope to master only ([](https://github.com/Agentex9/Tech_Mahindra_Project/commit/3cd9daaa086985f8e965e3ea77c411f65a54d2ed))
* **Configuracion:** add example env and env reading on settings ([](https://github.com/Agentex9/Tech_Mahindra_Project/commit/8417f749cd735856a6c875fc5cd2df353bbc40e9))
* **Dependencias:** add requirements.txt for backend ([](https://github.com/Agentex9/Tech_Mahindra_Project/commit/9ae1f9e0e5e24cc2558cd0229f847f04968d46e4))
* **Release:** add semantic release ([](https://github.com/Agentex9/Tech_Mahindra_Project/commit/1139714dcc94b7ec90383fb29ce4367b6afb80bc))


### docs

* **General:** add readme file ([](https://github.com/Agentex9/Tech_Mahindra_Project/commit/d3422ed3fafffc67a7c53a7f2aaa80f71515f3ca))


### fix

* **CI/CD:** normilize node version for workflow ([](https://github.com/Agentex9/Tech_Mahindra_Project/commit/8c0afc1840719c304906b7d91f451ce815622801))
* **Release:** modify minor workflow error ([](https://github.com/Agentex9/Tech_Mahindra_Project/commit/bbcb0386eefac3d7a3ccbd6a492fc3768b8c0061))
