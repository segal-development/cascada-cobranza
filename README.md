# Cascada de Cobranza — CRM Grupo Segal

CRM web para la cascada de cobranza. Frontend estático (HTML + JS) sobre Supabase.

## Deploy en Netlify — 3 formas

### Opción A: Drag & drop (lo más rápido, 30 segundos)
1. Ir a https://app.netlify.com/drop
2. Arrastrar los 3 archivos (`index.html`, `app.js`, `netlify.toml`) a la zona de drop
3. Netlify te da una URL del tipo `xyz.netlify.app` que ya funciona

### Opción B: Netlify CLI (si ya la tienes instalada)
```bash
cd cascada-app
netlify deploy --prod
```

### Opción C: Git + Netlify (recomendado a mediano plazo)
1. Subir la carpeta a un repo en GitHub
2. Conectar el repo en Netlify
3. Cada push a main = deploy automático

---

## Usuarios iniciales

Todos tienen contraseña temporal: **`Cascada2026!`**

| Email | Rol | Meta |
|---|---|---|
| `jefa@segal.cl` | Jefatura | 30 |
| `pool@segal.cl` | Pool jefatura | 30 |
| `clara@segal.cl` | Cobradora | 80 |
| `jocelyn@segal.cl` | Cobradora | 90 |
| `luis@segal.cl` | Cobradora | 100 |
| `jeannette@segal.cl` | Cobradora | 110 |
| `verouschka@segal.cl` | Cobradora | 120 |

**Cambio de contraseña:** desde Supabase Dashboard → Authentication → Users → Reset Password.

---

## Primera carga de la cartera

1. Ingresar con `jefa@segal.cl`
2. Click en **+ Carga mensual** (sidebar izquierda)
3. Arrastrar el XLSX del ERP (`cartera_cobradores.xlsx` o el que venga cada mes)
4. Revisar preview (te muestra cuántos registros y distribución por cobradora)
5. Confirmar

El sistema:
- Crea clientes nuevos y actualiza los existentes (mantiene cobradora asignada)
- Mapea últimas gestiones del ERP a nuestra tabla de gestiones
- Calcula automáticamente la regla de cada cuota (R1–R7, Sayorana, Pre-desistido)
- Detecta zonas críticas y acciones sugeridas al vuelo

---

## Estructura técnica

- **Backend:** Supabase proyecto `segal-cobranzas` (región sa-east-1), schema `cascada`
- **Auth:** email + password nativo de Supabase
- **RLS:** cobradora ve solo su cartera; jefatura ve todo
- **Motor de reglas:** funciones SQL + vistas que recalculan al vuelo (no hay botón "recalcular" manual necesario)
- **Frontend:** HTML + vanilla JS + supabase-js + SheetJS para leer XLSX

---

## Notas operativas

- **Cambios de código en tiempo real:** sólo editar `index.html` o `app.js` y redeployar
- **Backups:** Supabase Pro incluye PITR; en Free tier hay snapshot diario automático
- **Monitoreo:** Supabase Dashboard → Logs
- **Si el proyecto Supabase se "duerme"** (Free tier tras 7 días sin actividad): el primer login demora 30-60s, luego vuelve a la normalidad
