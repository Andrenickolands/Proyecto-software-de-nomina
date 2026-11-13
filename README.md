# Software de Nómina Web
### Ingeniería de Software, Fundación Universitaria Compensar

Aplicación web para liquidar la nómina de una empresa con varias sedes en Colombia. Lleva la asistencia diaria, calcula horas extra y recargos, liquida cada quincena con salud, pensión y retención, imprime desprendibles, saca el consolidado del mes con la PILA y liquida el contrato cuando alguien se retira. Todos los valores de ley se configuran desde la app.

**Aplicación en producción:** https://proyecto-software-de-nomina.onrender.com

**Repositorio:** https://github.com/Andrenickolands/Proyecto-software-de-nomina

> El servicio está en el plan free de Render: si lleva más de 15 minutos sin tráfico se duerme, y la primera carga tarda entre 30 y 60 segundos. No es un bug, es la limitación del hosting gratuito. La base de datos gratis de Render se borra a los 30 días; para la entrega no es problema.

---
---

## 1. Descripción del proyecto y experiencia de aprendizaje

El proyecto salió de un Excel real que se usaba para la nómina de un almacén. Ese Excel tenía las hojas de horarios, días de descanso, asistencia, conteo de horas, nómina quincenal, jornales y consolidado del mes. Lo tomé como referencia de cómo trabaja el negocio, pero los datos de este repositorio son inventados.

El reto principal no era el CRUD sino que **los cálculos cumplieran la ley colombiana vigente**. En 2026 cambiaron varias cosas a mitad de año: el recargo dominical pasó del 80 % al 90 % el 1 de julio y la jornada bajó de 44 a 42 horas el 15 de julio. Por eso los parámetros tienen fecha de vigencia, y el cálculo usa, día por día, la norma que regía en esa fecha.

### Pantallas

| | |
|---|---|
| ![Resumen](./docs/img/resumen.png) | ![Asistencia](./docs/img/asistencia.png) |
| *Resumen de la quincena* | *Asistencia: cada cuadro es un día* |
| ![Nómina](./docs/img/nomina.png) | ![Desprendible](./docs/img/desprendible.png) |
| *Nómina quincenal* | *Desprendible de pago* |
| ![Consolidado](./docs/img/consolidado.png) | ![Liquidación de contrato](./docs/img/liquidacion-contrato.png) |
| *Consolidado del mes (PILA y prestaciones)* | *Liquidación de contrato* |

![Parámetros legales](./docs/img/parametros.png)
*Parámetros legales con fecha de vigencia.*

### Arquitectura general del sistema

![Arquitectura](./docs/img/arquitectura.png)
*Figura 1: Un solo servicio en Render. Express entrega la página de React y la API en la misma URL.*

### Diagrama de clases de la base de datos

![Diagrama de clases de la base de datos](./docs/img/clases-bd.png)
*Figura 2: Tablas de la base de datos y sus relaciones.*

Notas sobre el modelo:
- `liquidaciones` guarda una "foto" en JSON de cada persona al liquidar la quincena. Así, aunque después cambie el salario o un parámetro, lo que ya se pagó no cambia.
- `parametros` guarda todos los valores de ley de cada versión en un JSON, con su `vigente_desde`. Agregar un parámetro nuevo no obliga a cambiar la tabla.
- `asistencia` tiene una fila por persona y por día, con índice único `(colaborador_id, fecha)`.
- `auditoria` registra quién liquidó, reabrió o cambió datos.

### Diagramas de flujo

![Flujo de la quincena](./docs/img/flujo-quincena.png)
*Figura 3: Lo que hace el usuario para cerrar una quincena.*

![Flujo del cálculo](./docs/img/flujo-calculo.png)
*Figura 4: Lo que hace el sistema para liquidar a cada persona.*

Los archivos fuente de los diagramas están en `docs/diagramas/` en formato Mermaid. Se pueden editar pegándolos en https://mermaid.live y volver a exportar la imagen.

### Experiencia de aprendizaje

Lo que más me costó fue entender la parte legal antes de programarla. Tuve que leer sobre:
- El artículo 134 del CST, que dice que un jornal no se puede pagar por quincena (máximo cada semana).
- El Decreto 2616 de 2013, para la gente que trabaja pocos días al mes y cotiza por semanas.
- La Ley 1393, por la que lo no salarial que pase del 40 % entra a la base de aportes.
- Cómo se calcula la retención en la fuente con dependientes.

Varias veces tuve que rehacer un cálculo porque al principio lo había entendido mal. Por ejemplo, al inicio el jornal no llevaba seguridad social, y eso es ilegal si hay contrato laboral.

En la parte técnica aprendí a organizar el backend por capas para que el cálculo no dependa de Express ni de la base de datos. Gracias a eso pude probar toda la lógica de nómina con pruebas unitarias sin levantar nada.

---

### Árbol de carpetas

```
nomina-app/
├── Dockerfile                      # imagen única: compila React y la sirve con Express
├── docker-compose.yml              # app + PostgreSQL para correr en local
├── render.yaml                     # despliegue en Render (app + base de datos)
├── docs/
│   ├── diagramas/                  # fuentes Mermaid de los diagramas
│   └── img/                        # capturas y diagramas exportados
├── server/
│   ├── src/
│   │   ├── domain/                 # cálculos puros, sin base de datos ni Express
│   │   │   ├── fechas.js           # mes comercial, días 360, semanas
│   │   │   ├── festivos.js         # festivos de Colombia (Ley Emiliani)
│   │   │   ├── horas.js            # ordinarias, extra, nocturnas, dominicales
│   │   │   ├── parametros.js       # valores de ley y vigencias
│   │   │   └── liquidacion/
│   │   │       ├── estrategiaSalario.js    # salario y salario integral
│   │   │       ├── estrategiaJornal.js     # trabajador por días
│   │   │       ├── estrategiaServicios.js  # contratista
│   │   │       ├── formaPago.js            # diaria, semanal, quincenal, mensual
│   │   │       ├── aportes.js              # PILA, FSP, retención, prestaciones
│   │   │       ├── terminacion.js          # liquidación de contrato
│   │   │       └── index.js                # registro de estrategias
│   │   ├── application/            # casos de uso (servicios)
│   │   ├── infrastructure/         # conexión, esquema, repositorios, bcrypt/jwt
│   │   ├── interfaces/http/        # rutas, validación con Zod, middlewares
│   │   ├── config.js
│   │   └── main.js                 # aquí se conecta todo
│   └── test/engine.test.js         # 27 pruebas del cálculo
└── client/
    └── src/
        ├── api/                    # todas las llamadas al backend
        ├── context/                # sesión, quincena activa, avisos
        ├── components/             # Marco, Panel, Campo, Boton, Iconos
        └── features/               # una carpeta por pantalla
            ├── asistencia/
            ├── nomina/             # Nomina, Desprendible, Novedades, PagosDiarios
            ├── consolidado/
            ├── personal/           # Colaboradores, Sedes, Terminacion
            ├── configuracion/      # Parámetros, Festivos, Usuarios, Actividad
            └── resumen/
```

---

### Componentes clave

| Archivo | Qué hace |
|---|---|
| `domain/horas.js` | Recorre cada minuto del turno y lo marca como diurno o nocturno. Acumula las horas de la semana y lo que pase de 42 h lo cuenta como extra. Domingos y festivos van aparte. También avisa si alguien pasa de 2 h extra al día o 12 a la semana. |
| `domain/liquidacion/index.js` | Elige la forma de liquidar según el tipo de vinculación. Para agregar uno nuevo (por ejemplo, aprendiz SENA) basta con crear el archivo y registrarlo. |
| `domain/liquidacion/terminacion.js` | Liquidación al retirarse: cesantías, intereses, prima, vacaciones e indemnización según el motivo y el tipo de contrato. |
| `domain/parametros.js` | Valores de ley de 2026 y la función que devuelve los que regían en una fecha dada. |
| `features/asistencia/Asistencia.jsx` | Rejilla de personas por días. Se llena con el horario base y se corrige tocando cada día o registrando por fechas (licencias de 126 días, vacaciones). |
| `features/nomina/Desprendible.jsx` | Desprendible de pago con talón para firmar. Se imprime uno o todos. |
| `features/configuracion/Parametros.jsx` | Línea de tiempo con las versiones de los parámetros legales. |

---

## 2. Tecnologías y versiones

| Categoría | Tecnología | Versión |
|---|---|---|
| Runtime | Node.js | 22 |
| Backend | Express | 4.22 |
| Backend | Knex (consultas SQL) | 3.3 |
| Backend | pg (driver PostgreSQL) | 8.23 |
| Backend | better-sqlite3 (solo local) | 11.10 |
| Validación | Zod | 4.6 |
| Seguridad | helmet, jsonwebtoken, bcryptjs, express-rate-limit | 8.3 / 9.0 / 2.4 / 8.7 |
| Testing | node:test (el que trae Node) | — |
| Base de datos | PostgreSQL | 16 |
| Frontend | React | 18.3 |
| Frontend | React Router | 6.30 |
| Frontend | Vite | 5.4 |
| Fuentes | Bricolage Grotesque y Atkinson Hyperlegible (con @fontsource) | — |
| Contenedores | Docker / Docker Compose | — |
| Diagramas | Mermaid | — |

No usé TypeScript ni Tailwind: JavaScript plano y CSS con variables.

---
---

## 3. Instalación y ejecución

### Opción A: Docker (recomendada)

Requiere [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
git clone https://github.com/Andrenickolands/Proyecto-software-de-nomina.git
cd Proyecto-software-de-nomina
cp .env.example .env
docker compose up --build
```

En `.env` van las claves de la base de datos y del administrador. Levanta 2 contenedores: PostgreSQL y la app. La primera vez se crean las tablas, el usuario administrador, los parámetros de 2026, los festivos y unos colaboradores de ejemplo.

- App: http://localhost:3000
- Usuario: el de `ADMIN_EMAIL` y `ADMIN_PASSWORD` en `.env`

Para empezar de cero (borra los datos):
```bash
docker compose down -v
docker compose up --build
```

---

### Opción B: local, sin Docker

Solo requiere Node.js 22. Usa SQLite, así que no hace falta instalar PostgreSQL.

**1. Backend**
```bash
cd server
npm install
npm run dev
```
Queda en `http://localhost:3000`. La base se crea sola en `server/data/nomina.sqlite`.

**2. Frontend** (en otra terminal)
```bash
cd client
npm install
npm run dev
```
Queda en `http://localhost:5173`. Vite redirige `/api` al backend.

Usuario de desarrollo: `admin@nomina.co` / `admin12345`.

---
---

## 4. Variables de entorno

```env
DATABASE_URL=postgres://usuario:clave@host:5432/nomina
JWT_SECRET=un-texto-aleatorio-de-al-menos-32-caracteres
ADMIN_EMAIL=admin@empresa.co
ADMIN_PASSWORD=UnaClaveSegura2026
SEED_DEMO=true
```

| Variable | Propósito |
|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL. Si no está, la app usa SQLite. |
| `DATABASE_SSL` | `false` para conectarse sin SSL (red interna de Render o Docker). |
| `JWT_SECRET` | Clave para firmar la sesión. En producción la app no arranca si falta o es corta. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Primer usuario administrador. Solo se usan la primera vez. |
| `SEED_DEMO` | `true` carga sedes y colaboradores de ejemplo. |
| `CORS_ORIGIN` | Solo si el frontend queda en otro dominio. Normalmente no hace falta. |
| `PORT` | Puerto de Express. Por defecto 3000. |

---
---

## 5. Pruebas

```bash
cd server
npm test
```

Son 27 pruebas sobre el cálculo, sin base de datos. Verifican, entre otras cosas:

- Que los festivos de 2026 sean los correctos, incluido el caso de 2025 en que San Pedro y el Sagrado Corazón caen el mismo lunes.
- Que el dominical sea del 80 % el 30 de junio y del 90 % el 1 de julio, y la jornada de 44 h el 14 de julio y de 42 h el 15.
- Que se cuenten bien las horas extra semanales y el recargo nocturno desde las 7 p. m.
- Que la quincena de un salario mínimo dé el sueldo, el auxilio y los aportes correctos.
- Las faltas, incapacidades y licencias de maternidad.
- El jornal: que no se pague por quincena y que coticen por semanas quienes trabajan pocos días.
- El IBC: piso de un mínimo, techo de 25 y regla del 40 %.
- El salario integral.
- La retención con dependientes y medicina prepagada.
- La liquidación de contrato: despido sin justa causa, renuncia, término fijo e integral.

Además probé la API completa contra PostgreSQL y SQLite. Las dos dan los mismos totales.

---
---

## 6. Normativa que aplica

| Tema | Regla | Norma |
|---|---|---|
| Salario mínimo y auxilio 2026 | $1.750.905 y $249.095 | Decretos 1469 y 1470 de 2025 |
| UVT 2026 | $52.374 | Resolución DIAN 000238 de 2025 |
| Jornada | 44 h hasta el 14-jul-2026, 42 h desde el 15-jul-2026 | Ley 2101 de 2021 |
| Jornada nocturna | De 7 p. m. a 6 a. m., recargo del 35 % | Ley 2466 de 2025 |
| Dominical y festivo | 80 % hasta el 30-jun-2026, 90 % desde el 1-jul-2026 | Ley 2466 de 2025 |
| Horas extra | 25 % diurna, 75 % nocturna; máximo 2 al día y 12 a la semana | CST art. 167-A |
| Periodo de pago | Jornal máximo cada semana, sueldo máximo cada mes | CST art. 134 |
| Trabajo por días | Cotiza por semanas si gana menos de un mínimo en el mes | Decreto 2616 de 2013 |
| Pagos no salariales | Lo que pase del 40 % entra al IBC | Ley 1393 de 2010 |
| Salario integral | Mínimo 13 SMMLV; aportes sobre el 70 % | CST art. 132 |
| Aportes del empleador | Exoneración de salud, SENA e ICBF por debajo de 10 SMMLV | E.T. art. 114-1 |
| Retención | Procedimiento 1, dependientes, vivienda, medicina prepagada, renta exenta del 25 %, límite del 40 % | E.T. arts. 383, 387 y 206 |
| Licencias | Maternidad 18 semanas, paternidad 2 semanas | Ley 2114 de 2021 |
| Indemnización | Indefinido: 30 días el primer año + 20 por año (o 20 + 15 desde 10 SMMLV); fijo: salarios faltantes | CST art. 64 |
| Festivos | Los trasladables pasan al lunes | Ley 51 de 1983 |

---
---

## 7. Decisiones técnicas, supuestos y limitaciones

### Decisiones técnicas y qué descarté

**Arquitectura por capas (domain, application, infrastructure, interfaces), en vez de MVC.** En nómina, la parte importante es el cálculo, y quería que no dependiera de Express ni de la base de datos. El dominio son funciones puras: reciben datos y devuelven la liquidación. Así se pueden probar solas y se puede cambiar de SQLite a PostgreSQL sin tocar el cálculo. Con MVC, la lógica hubiera terminado repartida en los controladores.

**Patrón Strategy para los tipos de vinculación.** Salario, salario integral, jornal y prestación de servicios se liquidan distinto. En vez de llenar el código de `if (tipo === ...)`, cada tipo es un objeto con `liquidar()` y `consolidar()`, y se registra en un mapa. Para agregar uno nuevo no hay que modificar los que ya están. La forma de pago funciona igual.

**Repositorios + inyección de dependencias.** Los servicios no conocen Knex, bcrypt ni jwt; los reciben ya armados desde `main.js`. Es el único archivo que sabe qué piezas concretas se usan.

**Parámetros con fecha de vigencia, en vez de constantes en el código.** Los valores de ley cambian cada año, y en 2026 cambiaron a mitad de año. Si estuvieran en el código, cada cambio sería un despliegue. Así, el dueño crea una versión nueva desde la app y el cálculo usa la que corresponda a cada día.

**Guardar una foto en JSON de cada quincena liquidada, en vez de recalcular siempre.** Si alguien cambia un salario en diciembre, la nómina de octubre no debería cambiar. Por eso, al liquidar, se guarda el resultado completo. Para corregir hay que reabrir la quincena, y queda registrado en la auditoría.

**Una sola imagen Docker con frontend y backend, en vez de dos servicios.** React se compila a archivos estáticos y Express los sirve junto con la API. Así queda una sola URL, no hay que configurar CORS, y en el plan gratis de Render solo hay un servicio que despertar.

**Knex en vez de SQL a mano o un ORM grande como Prisma.** Necesitaba que el mismo código funcionara con SQLite (local) y PostgreSQL (producción). Knex arma consultas con parámetros, lo que evita inyección SQL, sin agregar una capa pesada.

### Seguridad

- Contraseñas con bcrypt (costo 12) y sesión con JWT de 8 horas, guardada en `sessionStorage`.
- Máximo 10 intentos fallidos de ingreso cada 15 minutos. Si el correo no existe, la respuesta tarda lo mismo, para que no se pueda adivinar qué usuarios hay.
- Dos roles: administrador (puede editar) y consulta (solo puede ver). Se valida en el servidor, no solo escondiendo botones.
- Todo lo que llega del navegador pasa por un esquema de Zod.
- Helmet con política de contenido estricta y HSTS. Los errores 500 no muestran detalles internos.
- El contenedor corre con un usuario sin permisos de administrador.

### Supuestos que asumí

- **Mes comercial de 30 días.** Cada quincena paga 15 días, el 31 no suma y febrero se completa a 30.
- **La hora dominical se paga completa más el recargo (×1,90),** como estaba en el Excel original. Si el salario ya cubre ese día, se desmarca una opción en Parámetros y solo se paga el 90 %.
- **El valor de la hora es el salario ÷ 210** con la jornada de 42 h (42 × 5). El Excel usaba 182; dejé 210 porque es el divisor que se usa normalmente, pero se puede cambiar.
- **Las cesantías de años anteriores ya se consignaron al fondo** y la prima del semestre anterior ya se pagó. La liquidación de contrato solo calcula lo del año y el semestre en curso.
- **Al trabajador por días, la salud y la pensión se le descuentan en la segunda quincena,** porque la forma de cotizar depende de cuántos días trabajó en el mes.
- **Las licencias de maternidad y paternidad las paga la empresa** y luego le hace el cobro a la EPS. La app avisa para que no se olvide.
- **El salario integral tiene retención** con la renta exenta del 25 %, según el Oficio DIAN 8711 de 2019.

### Qué dejé fuera y cómo lo resolvería

- **Nómina electrónica de la DIAN.** Habría que generar el XML con el formato de la DIAN y enviarlo con un proveedor tecnológico autorizado. Sería un caso de uso nuevo que toma la foto de la quincena liquidada.
- **Archivo plano de la PILA.** Ya están los valores; faltaría exportarlos con el formato del operador (SOI, Aportes en Línea).
- **Retención por procedimiento 2** y aportes voluntarios (AFC, pensión voluntaria).
- **Dotación.** La app solo lo recuerda; no lleva el control de las tres entregas al año.
- **Licencia parental compartida** (repartir semanas entre papá y mamá). Hoy se registra como licencia normal por fechas.
- **Retención sobre la indemnización.** La app avisa cuando podría aplicar, pero no la calcula.

### La parte más frágil de mi solución

El cálculo de horas recorre cada minuto del turno. Es muy preciso, porque sabe exactamente cuántos minutos caen después de las 7 p. m., y para una empresa pequeña es instantáneo. Pero con cientos de empleados y meses completos sería lento. La mejora sería calcular por tramos (de la hora de entrada a las 7 p. m., de las 7 p. m. a la salida) en vez de minuto a minuto.

También dependo de que el usuario actualice los parámetros cada año. Si en enero de 2027 nadie crea la versión con el nuevo salario mínimo, la app sigue calculando con el de 2026. Agregaría un aviso en el resumen cuando la versión vigente sea del año anterior.

---
---

## 8. Despliegue

### Cómo está armado el Dockerfile

El `Dockerfile` tiene tres etapas, para que la imagen final quede liviana:

1. **cliente:** instala las dependencias de `client/` y compila React con Vite. El resultado son archivos estáticos en `dist/`.
2. **dependencias:** instala solo las dependencias de producción de `server/`, sin las de desarrollo.
3. **imagen final:** copia el código del servidor, sus dependencias y los archivos de React en `public/`. Express sirve esos archivos y la API en el mismo puerto.

La imagen final corre con el usuario `node` (no root) y tiene un `HEALTHCHECK` que consulta `/api/health`. Al arrancar, la app crea las tablas que falten y, si la base está vacía, carga el usuario administrador, los parámetros de 2026 y los festivos. Por eso no hay que correr migraciones a mano.

### Despliegue en Render

La app está en Render, en el plan gratuito: https://proyecto-software-de-nomina.onrender.com

Para desplegarla usé un Blueprint: el archivo `render.yaml` describe todo lo que Render debe crear, así que no hay que configurar nada a mano en el panel. Define dos recursos:

- **`proyecto-software-de-nomina`:** servicio web que se construye con el `Dockerfile` y usa `/api/health` como health check.
- **`nomina-db`:** base de datos PostgreSQL gratuita. Su cadena de conexión le llega a la app en `DATABASE_URL` por la red interna de Render, por eso va `DATABASE_SSL=false`.

`JWT_SECRET` lo genera Render al crear el servicio. `ADMIN_EMAIL` y `ADMIN_PASSWORD` se escriben una sola vez, al desplegar, y no quedan en el repositorio. Cada vez que hago push a `main`, Render vuelve a construir y publicar la app.

La base de datos gratuita de Render dura 30 días. Para este trabajo es suficiente; si la app se fuera a usar de verdad, movería la base a un servicio que no se venza, como Neon. Solo habría que cambiar `DATABASE_URL`, porque la app no depende del proveedor.

### En un servidor Ubuntu propio

Con el mismo `docker-compose.yml` se puede montar en cualquier servidor con Docker:

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin nginx
git clone https://github.com/Andrenickolands/Proyecto-software-de-nomina.git && cd Proyecto-software-de-nomina
cp .env.example .env
docker compose up --build -d
```

Nginx como proxy en `/etc/nginx/sites-available/nomina`:
```nginx
server {
    listen 80;
    server_name tu-dominio.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/nomina /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
sudo apt install -y certbot python3-certbot-nginx && sudo certbot --nginx -d tu-dominio.com
```

---
---

## Nota final

Es un trabajo académico, y aunque revisé la normativa con fuentes oficiales, una nómina real debería revisarla un contador antes de pagar. Traté de que el README alcance para levantar el proyecto sin preguntarme nada. Si algo no funciona siguiendo estos pasos, es un error que vale la pena reportar.
