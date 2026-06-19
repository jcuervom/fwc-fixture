# Mundial 26 · En Vivo

Front en **Angular 20** que muestra el calendario completo (fixtures) del Mundial 2026
con los **marcadores en directo**, listo para desplegar en **GitHub Pages**.

- Datos de [TheSportsDB](https://www.thesportsdb.com) (API pública, sin clave, con CORS).
- Carga primero el día activo para pintar rápido y completa el resto del torneo en segundo plano.
- Se **actualiza solo** cada 30 s mientras hay partidos en juego (pausable desde la barra superior).
- Si el proveedor no responde, muestra un ejemplo del calendario para no quedarse en blanco.

## Desarrollo

```bash
npm install
npm start          # http://localhost:4200
```

## Despliegue en GitHub Pages (automático)

El repo incluye un workflow en `.github/workflows/deploy.yml` que compila y publica en cada `push` a `main`.

1. Sube el repo a GitHub (ver abajo).
2. En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Cada `push` a `main` despliega en `https://<usuario>.github.io/<repo>/`.

El workflow ajusta el `--base-href` al nombre del repositorio automáticamente, así que funciona
en cualquier _project page_ sin tocar nada.

### Primera subida

```bash
git add -A
git commit -m "Mundial 26 en vivo"
gh repo create fwc-fixture --public --source=. --push   # o crea el repo en github.com y haz git push
```

## Datos y créditos

Marcadores no oficiales servidos por TheSportsDB. La liga usada es _FIFA World Cup_ (idLeague 4429),
temporada 2026, consultada por día con `eventsday.php`.
