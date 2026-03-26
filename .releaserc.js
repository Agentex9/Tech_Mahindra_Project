const config = {
  tagFormat: 'v${version}',
  branches: ['main', 'master'],
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'angular',
        releaseRules: [
          { type: 'feat', release: 'minor' },
          { type: 'fix', release: 'patch' },
          { type: 'perf', release: 'patch' },
          { type: 'refactor', release: 'patch' },
          { type: 'revert', release: 'patch' },
          { type: 'build', release: 'patch' },
          { type: 'ci', release: 'patch' },
          { type: 'security', release: 'patch' },
          { breaking: true, release: 'major' },
          { type: 'docs', release: false },
          { type: 'style', release: false },
          { type: 'chore', release: false },
          { type: 'test', release: false }
        ]
      }
    ],
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'angular',
        presetConfig: {
          types: [
            { type: 'feat', section: '✨ Nuevas Caracteristicas', hidden: false },
            { type: 'fix', section: '🐛 Correcciones', hidden: false },
            { type: 'perf', section: '⚡ Rendimiento', hidden: false },
            { type: 'security', section: '🔒 Seguridad', hidden: false },
            { type: 'refactor', section: '♻️ Refactor', hidden: false },
            { type: 'build', section: '🏗️ Build y Entrega', hidden: false },
            { type: 'ci', section: '🤖 CI/CD', hidden: false },
            { type: 'revert', section: '⏪ Reversiones', hidden: false },
            { type: 'docs', section: '📝 Documentacion', hidden: false },
            { type: 'style', section: '🎨 Estilos', hidden: false },
            { type: 'chore', section: '🧰 Mantenimiento', hidden: false },
            { type: 'test', section: 'Testing', hidden: true }
          ]
        },
        writerOpts: {
          transform: (commit) => {
            const scope = commit.scope || 'repo';

            const scopeMap = {
              ui: 'Interfaz',
              pages: 'Paginas',
              components: 'Componentes',
              styles: 'Estilos',
              assets: 'Assets',
              api: 'API',
              auth: 'Autenticacion',
              seo: 'SEO',
              content: 'Contenido',
              config: 'Configuracion',
              build: 'Build',
              ci: 'CI/CD',
              release: 'Release',
              deps: 'Dependencias',
              repo: 'General'
            };

            return {
              ...commit,
              scope: scopeMap[scope] || scope
            };
          }
        }
      }
    ],
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md',
        changelogTitle: `# 📘 Changelog - Tech Mahindra Project

Cambios relevantes del proyecto siguiendo Semantic Versioning.
`
      }
    ],
    [
      '@semantic-release/exec',
      {
        prepareCmd: 'bun scripts/sync-versions.mjs ${nextRelease.version}'
      }
    ],
    [
      '@semantic-release/github',
      {
        addReleases: 'bottom',
        releaseNameTemplate: 'v${nextRelease.version}'
      }
    ],
    [
      '@semantic-release/git',
      {
        assets: [
          'package.json',
          'CHANGELOG.md'
        ],
        message: 'chore(release): v${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
      }
    ]
  ]
};

export default config;
