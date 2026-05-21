# ConduPro API

Backend de la plataforma ConduPro (escuelas de conducción).

## Ramas

| Rama | Uso |
|------|-----|
| `main` | Producción — solo se actualiza mediante Pull Request |
| `dev` | Desarrollo e integración del backend |

El código del API se desarrolla en `dev` y llega a producción cuando un PR es aprobado y mergeado a `main`.

## Despliegue

Ver [infra/README.md](infra/README.md) para Terraform, EC2 y GitHub Actions.