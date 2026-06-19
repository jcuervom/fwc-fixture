# Mundial 26 · Cuadro en Vivo

Aplicación Angular para seguir el fixture del Mundial 2026, proyectar cruces de
eliminación directa y mostrar clasificaciones de grupos con marcadores en vivo.

## Estado del Proyecto

- Angular 22.
- Datos no oficiales desde endpoints públicos de ESPN.
- Clasificación de grupos proyectada con partidos finalizados y en juego.
- Proyección de cruces para ganadores, segundos y mejores terceros.
- Jest para pruebas unitarias.
- Playwright para pruebas end-to-end.
- CI, CodeQL y deploy a GitHub Pages en un solo workflow encadenado.

## Desarrollo

Usa Node `24.15.0`, definido en `.nvmrc`.

```bash
nvm use
npm ci
npm start
```

La app queda disponible en:

```text
http://localhost:4200
```

## Validación

```bash
npm audit --audit-level=low
npm run build
npm run test:unit
npm run test:e2e
npm run test:all
```

Antes de correr Playwright por primera vez:

```bash
npx playwright install chromium
```

## CI y Deploy

El workflow principal está en `.github/workflows/ci.yml` y funciona por stages:

```text
quality -> codeql -> build-pages -> deploy
```

- `quality` corre `npm ci`, audit, build, Jest y Playwright.
- `codeql` ejecuta análisis estático de JavaScript/TypeScript.
- `build-pages` solo corre en `main` cuando los checks anteriores pasan.
- `deploy` publica en GitHub Pages solo después del build.

En GitHub Pages configura:

```text
Settings -> Pages -> Build and deployment -> Source: GitHub Actions
```

## Seguridad del Repositorio

Este repo incluye:

- `LICENSE` propietaria con todos los derechos reservados.
- `SECURITY.md` para reportes privados de vulnerabilidades.
- `.github/CODEOWNERS` con `@jcuervom` como owner global.
- `.github/dependabot.yml` para npm y GitHub Actions.
- GitHub Actions pinneadas por SHA.
- Permisos mínimos por job en GitHub Actions.
- `npm audit --audit-level=low` como gate de CI.
- CodeQL como gate antes de deploy.

En `jcuervom/fwc-fixture` ya se aplicaron protecciones sobre `main`:

- Pull request obligatorio antes de merge.
- 1 aprobación requerida.
- Review obligatorio de CODEOWNERS.
- Aprobaciones obsoletas se descartan tras nuevos pushes.
- Aprobación del último push requerida.
- Status checks requeridos: `Quality` y `CodeQL`.
- Branch actualizado antes de merge.
- Commits firmados recomendados. Activa esta regla cuando Git signing este
  configurado para todos los maintainers.
- Historial lineal requerido.
- Conversaciones resueltas antes de merge.
- Force pushes bloqueados.
- Borrado de `main` bloqueado.
- Admins incluidos en la protección.

Para forks o repos nuevos, replica estas reglas desde:

```text
Settings -> Rules -> Rulesets -> New branch ruleset
```

## Licencia

Este proyecto es propietario. Todos los derechos reservados.

No se concede permiso para usar, copiar, modificar, publicar, distribuir,
sublicenciar, vender, alojar, desplegar o crear trabajos derivados sin permiso
previo por escrito del titular del copyright.

## Datos y Créditos

Marcadores y clasificaciones no oficiales servidos por ESPN. Este proyecto no
está afiliado a FIFA, ESPN ni a sus marcas relacionadas.

Copyright (c) 2026 Jose Cuervo. Todos los derechos reservados.
