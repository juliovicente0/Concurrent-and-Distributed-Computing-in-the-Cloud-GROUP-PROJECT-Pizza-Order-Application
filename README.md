# Pizza Order Application — Despliegue con Docker y CI/CD

Práctica 4 — Final de Administración de Servidores.
API REST de gestión de pizzerías (Express 5 + MariaDB), empaquetada con Docker, orquestada con Docker Compose y desplegada automáticamente en una VM de Azure mediante GitHub Actions.

## Arquitectura

```
                    ┌──────────────────────────────────────┐
                    │              VM Azure                │
   Internet ──:80──►│  ┌────────┐   ┌────────┐  ┌───────┐  │
                    │  │ nginx  │──►│  app   │─►│  db   │  │
                    │  │ proxy  │   │ Node22 │  │MariaDB│  │
                    │  └────────┘   └────────┘  └───────┘  │
                    │      frontend  │  backend (privada)  │
                    └──────────────────────────────────────┘
```

Tres servicios definidos en `docker-compose.yml`:

| Servicio | Imagen              | Puerto | Función                                            |
|----------|--------------------|--------|----------------------------------------------------|
| `proxy`  | `nginx:1.27-alpine`| 80     | Único expuesto a internet. Reverse proxy a la app. |
| `app`    | imagen propia GHCR | 8080   | API Express. **Sin puertos publicados** al host.   |
| `db`     | `mariadb:11`       | 3306   | Persistencia. Volumen `db_data` para datos.        |

La red `backend` es interna y privada — sólo `proxy`, `app` y `db` se ven entre sí. La red `frontend` es la que `nginx` publica al host. Esta separación es la que evita exponer la base de datos accidentalmente.

## Arrancar en local

Requisitos: Docker Desktop (o Docker Engine + Compose v2).

```bash
cp .env.example .env        # rellena las contraseñas
docker compose up --build   # construye y arranca los 3 servicios
```

Probar:

```bash
curl http://localhost/healthCheck     # devuelve "OK"
curl http://localhost/api/people      # endpoint real (puede requerir JWT)
```

Parar:

```bash
docker compose down          # mantiene los datos
docker compose down -v       # borra también el volumen de la BD
```

## Pipeline CI/CD

Definido en `.github/workflows/deploy.yml`. Se dispara en cada `push` a `main` (o manualmente desde la pestaña Actions).

### Etapas

1. **Test & lint** — `npm ci`, `node --check` sobre todos los `.js`, y `npm test` si existe.
2. **Build & push** — construye la imagen multi-stage y la publica en `ghcr.io/<owner>/<repo>` con tags `latest` y `sha-<short>`.
3. **Deploy** — SSH a la VM, copia `docker-compose.yml` + `nginx/default.conf` + `transactions.sql`, hace `docker compose pull && up -d` y verifica con `curl /healthCheck`.

### Secrets necesarios en el repo

Settings → Secrets and variables → Actions → New repository secret:

| Secret             | Qué es                                                   |
|--------------------|----------------------------------------------------------|
| `VPS_HOST`         | IP pública o DNS de la VM Azure                          |
| `VPS_USER`         | Usuario SSH (recomendado: `deploy`)                      |
| `VPS_PORT`         | Puerto SSH (por defecto `22`)                            |
| `VPS_SSH_KEY`      | Clave **privada** SSH (sin passphrase) en formato OpenSSH|
| `GHCR_PAT`         | Personal Access Token con scope `read:packages`          |
| `JWT_KEY`          | Clave aleatoria larga para firmar JWT                    |
| `DB_PASSWORD`      | Password del usuario `admin` de MariaDB                  |
| `DB_ROOT_PASSWORD` | Password de root de MariaDB                              |

> `GITHUB_TOKEN` no hace falta crearlo — GitHub lo inyecta automáticamente.

## Preparar la VM Azure (una sola vez)

```bash
# 1) Crear usuario "deploy" con permisos docker
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG docker deploy

# 2) En tu portátil, generar par de claves SSH dedicado para el CI
ssh-keygen -t ed25519 -f ~/.ssh/azure_pizza_deploy -N ""

# 3) Copiar la pública al servidor
ssh-copy-id -i ~/.ssh/azure_pizza_deploy.pub deploy@<VPS_HOST>

# 4) Instalar Docker (si no está)
curl -fsSL https://get.docker.com | sudo sh

# 5) Crear el directorio de trabajo
sudo mkdir -p /home/deploy/pizza-app && sudo chown deploy:deploy /home/deploy/pizza-app
```

En el portal de Azure, en el **Network Security Group** de la VM, abre los puertos:
- **22** (SSH) — restringido a tu IP si puedes
- **80** (HTTP)
- **443** (HTTPS, si añades TLS más adelante)

El contenido de `~/.ssh/azure_pizza_deploy` (la clave **privada**) es lo que va en el secret `VPS_SSH_KEY`.

## Buenas prácticas aplicadas

- **Multi-stage build** — la imagen final no contiene `npm`, devDependencies ni el lock; pesa ~150 MB en lugar de ~400 MB.
- **Usuario non-root** — el contenedor corre como el usuario `node` (UID 1000) que viene en la imagen `node:alpine`.
- **`tini` como PID 1** — propaga `SIGTERM` correctamente para apagado limpio.
- **Healthcheck** — Docker reinicia el contenedor si `/healthCheck` falla.
- **Red interna privada** — la BD nunca se publica al host.
- **Secrets fuera del repo** — `.env` está en `.gitignore` y se construye en la VM desde los secrets de GitHub en cada deploy.
- **Imagen base ligera** — `node:22-alpine` (~60 MB) y `mariadb:11` (~250 MB) en vez de las variantes Debian.

## ⚠️ Acciones pendientes en el repo

El `.env` está committeado en `main` con credenciales. Antes del primer push hay que:

```bash
git rm --cached .env
git commit -m "stop tracking .env (moved to .gitignore)"
```

Y rotar la `JWT_KEY` que está hardcodeada en el histórico (ya no será válida en producción, pero conviene asumir que está comprometida).

## Memoria técnica

### Decisiones de diseño

- **MariaDB en vez de PostgreSQL** — el código ya usa el driver `mariadb` y el esquema (`transactions.sql`) está escrito con sintaxis MySQL/MariaDB (CHECKs con REGEXP, ENUM, ON UPDATE CURRENT_TIMESTAMP). Cambiar a Postgres habría implicado reescribir migraciones.
- **nginx como reverse proxy** — añade una capa de aislamiento útil incluso con un solo backend: oculta puertos internos, gestiona timeouts y deja preparado el camino para TLS, rate-limiting o cabeceras de seguridad sin tocar la app.
- **Imagen publicada en GHCR (no Docker Hub)** — GHCR está integrado con GitHub Actions, autenticación con `GITHUB_TOKEN`, sin tirar de cuotas de pulls anónimos.
- **Tag `latest` + `sha-<short>`** — `latest` para conveniencia, SHA para poder hacer rollback puntual (`docker compose pull` con `APP_IMAGE` apuntando al SHA anterior).
- **`docker compose pull && up -d`** — recreación mínima: solo el contenedor `app` se reemplaza si la imagen cambió; `db` y `proxy` siguen vivos, así que no perdemos conexión a la BD entre deploys.

### Problemas encontrados

- *(rellenar durante el desarrollo: errores de healthcheck, problemas de permisos en el volumen de MariaDB, etc.)*

## Endpoints

Importar `ConcurrencyFinalProject Collection.postman_collection.json` en Postman/Insomnia para ver todos los endpoints con ejemplos.

Resumen:

| Recurso         | Path             |
|----------------|------------------|
| Health         | `GET /healthCheck` |
| Usuarios       | `/api/people`    |
| Pizzerías      | `/api/pizzaPlaces` |
| Pizzas         | `/api/pizzas`    |
| Cocineros      | `/api/cooks`     |
| Pedidos        | `/api/orders`    |
