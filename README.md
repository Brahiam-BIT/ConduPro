# ConduPro

> Sistema de gestión para escuelas de conducción.

---

## Estrategia de Branching

Para el desarrollo del proyecto **ConduPro** se adoptó la estrategia **GitHub Flow**, un modelo de branching ligero que se apoya en una rama principal (`main`) siempre estable y en ramas temporales de corta duración que se integran mediante **Pull Requests**.

---

### Justificación de la elección

La estrategia fue seleccionada con base en los siguientes criterios del proyecto:

#### 1. Tamaño del equipo

El equipo de desarrollo es reducido, lo cual hace innecesario adoptar estrategias más complejas como *GitFlow* —que introduce múltiples ramas permanentes (`develop`, `release`, `hotfix`)—. GitHub Flow permite una coordinación ágil entre los miembros del equipo mediante **feature branches** y revisiones de código vía Pull Requests, minimizando la sobrecarga operativa.

#### 2. Frecuencia de despliegue esperada

El proyecto se construye por módulos funcionales (gestión de usuarios, clases teóricas, clases prácticas, motor de validación y administración). Cada módulo puede desarrollarse e integrarse de forma incremental, lo que favorece un ciclo de integración continua donde las funcionalidades terminadas se incorporan rápidamente a `main`.

GitHub Flow facilita este enfoque al permitir:

- Crear una rama aislada por cada funcionalidad.
- Integrar cambios de forma rápida y controlada mediante Pull Requests.
- Mantener siempre una versión estable y desplegable en `main`.

#### 3. Complejidad del proceso de release

El proyecto no requiere mantener múltiples versiones en producción en paralelo ni procesos complejos de liberación. Una estrategia ligera como GitHub Flow es suficiente y reduce considerablemente la complejidad en la gestión del repositorio.

---

### Diagrama del flujo de trabajo

```
main ─────●────────────────────●────────────────────●──────── (siempre estable)
           \                  /\                   /
            \  feature/login /  \  feature/clases /
             ●──●──●──●────●    ●──●──●──●──────●
             crear   desarrollo  crear  desarrollo
             rama    + commits   rama   + commits
                     + PR                + PR
```

**Resumen del ciclo:**

```
1. Crear rama ──► 2. Desarrollar ──► 3. Abrir PR ──► 4. Revisión ──► 5. Merge a main
```

---

### Flujo de trabajo detallado

| Paso | Acción | Responsable |
|------|--------|-------------|
| 1 | Crear una rama desde `main` con la convención de nombres definida. | Desarrollador |
| 2 | Desarrollar la funcionalidad realizando commits descriptivos. | Desarrollador |
| 3 | Abrir un **Pull Request** hacia `main` siguiendo las reglas establecidas. | Desarrollador |
| 4 | Revisar el código, solicitar cambios si es necesario y aprobar. | Equipo / Revisor |
| 5 | Fusionar (*merge*) la rama a `main` y eliminar la rama de origen. | Desarrollador / Revisor |

---


**Reglas:**

- Usar **minúsculas** y separar palabras con guiones (`-`).
- Ser breve pero descriptivo (máximo 3–4 palabras tras el prefijo).
- No usar caracteres especiales, espacios ni mayúsculas.
- Eliminar la rama del repositorio remoto una vez fusionada.

---

### Reglas de Pull Requests

Todo cambio que se integre a `main` **debe** pasar por un Pull Request. A continuación se definen las reglas:

#### Título

Usar un formato claro y consistente:

```
[Tipo] Descripción breve del cambio
```

Ejemplos:

- `[Feature] Registro de usuarios`
- `[Fix] Corrección de validación en formulario de login`
- `[Docs] Actualización de estrategia de branching`

#### Descripción

El cuerpo del Pull Request debe incluir como mínimo:

1. **¿Qué se hizo?** — Resumen del cambio implementado.
2. **¿Por qué?** — Contexto o justificación del cambio.
3. **¿Cómo probarlo?** — Pasos para verificar que el cambio funciona correctamente.

#### Reglas de aprobación y merge

| Regla | Detalle |
|-------|---------|
| Revisión obligatoria | Al menos **1 aprobación** de otro miembro del equipo antes de fusionar. |
| Sin conflictos | El PR debe estar libre de conflictos con `main` antes del merge. |
| Commits limpios | Se recomienda hacer *squash merge* para mantener un historial limpio. |
| Rama eliminada | La rama de origen se elimina tras el merge. |
| Vinculación | Si existe un issue relacionado, referenciarlo en la descripción (e.g., `Closes #12`). |

---

### Ejemplo de ramas del proyecto

| Rama | Descripción |
|------|-------------|
| `main` | Versión estable del proyecto |
| `feature/registro-usuarios` | Módulo de registro de usuarios |
| `feature/login` | Autenticación de usuarios |
| `feature/clases-teoricas` | Gestión de clases teóricas |
| `feature/clases-practicas` | Gestión de clases prácticas |
| `feature/motor-validacion` | Motor de reglas de validación |
| `feature/panel-admin` | Panel de administración |

---

> Este enfoque permite mantener un flujo de trabajo **claro, colaborativo y escalable**, adecuado para el tamaño y alcance del proyecto ConduPro.
