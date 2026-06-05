# Cascada de Cobranza — Código Fuente
## Stack
- Frontend: HTML + CSS + JavaScript vanilla (index.html + app.js)
- Backend: Supabase (PostgreSQL)
- Hosting: Netlify (solo arrastrar los archivos)

## Archivos
- index.html     → UI completa del sistema
- app.js         → Toda la lógica del frontend
- netlify.toml   → Configuración de Netlify
- README.md      → Documentación general

## Proyecto Supabase
- Project ID : cqgdtqcwgtbqjxpibzzy
- Región     : sa-east-1 (São Paulo)
- URL        : https://cqgdtqcwgtbqjxpibzzy.supabase.co

## Usuarios
| Email              | Rol       | Meta |
|--------------------|-----------|------|
| jefa@segal.cl      | Jefatura  | 30   |
| pool@segal.cl      | Pool      | 30   |
| clara@segal.cl     | Cobradora | 80   |
| jocelyn@segal.cl   | Cobradora | 90   |
| luis@segal.cl      | Cobradora | 100  |
| jeannette@segal.cl | Cobradora | 110  |
| verouschka@segal.cl| Cobradora | 120  |

## Deploy
1. Abrir app.netlify.com → cascada-cobranza
2. Arrastrar index.html + app.js a la zona de deploy
3. Listo en 10 segundos

## Variables clave en app.js (líneas 1-10)
- SUPABASE_URL  : https://cqgdtqcwgtbqjxpibzzy.supabase.co
- SUPABASE_KEY  : sb_publishable_eb5J0xNHlCU4kPAau5Nvmw_q4sDoCjD

## Arquitectura BD (esquema cascada)
Tablas principales:
- clientes      → RUT, nombre, teléfono, cobradora_id
- cuotas        → RUT, monto, fec_vencimiento, estado, refere_mov
- gestiones     → RUT, efecto, nota, fec_gestion, origen
- cobradoras    → id, nombre, es_pool, meta_diaria
- cargas        → historial de archivos cargados

Vistas públicas (security_invoker):
- cascada_clientes  → vista principal con regla/mora/estado_gestion calculados
- cascada_recaudacion_cobradora
- cascada_cuotas_pagadas
- cascada_historial_pagos

RPCs principales:
- cascada.carga_mensual(registros, nombre_archivo)
- cascada.carga_pagos(registros, nombre_archivo)
- public.cascada_registrar_gestion(...)
- public.cascada_siguiente_cliente()
- public.cascada_kpi_gestionados()
- public.cascada_resumen_gestiones(cobradora_id, fecha)
- public.cascada_gestiones_rango(fecha_desde, fecha_hasta)
- public.cascada_sayorana_cron()  ← ejecutado por pg_cron 06:00 AM

## Cron Jobs
- sayorana-diaria: 0 9 * * * (UTC) = 06:00 AM Chile
  SELECT public.cascada_sayorana_cron()

## Notas para TI
- El sistema NO tiene servidor propio — solo Netlify + Supabase
- Las contraseñas de usuarios deben rotarse antes de uso productivo
- Supabase free tier pausa proyectos inactivos >7 días → considerar plan Pro ($25/mes)
- Todos los cambios de lógica de negocio están en las RPCs de Supabase (no en el JS)
