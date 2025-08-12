---
author: Matías Mirabelli (nyx)
title: Transaction Management en NodeJS
date: Agosto 13, 2025
---

# Concurrencia

![](image/concurrencia.png)

__Múltiples tareas compiten por el acceso al mismo recurso__

# ¿Qué son las transacciones?

![](image/atomico.png)

**Unidades atómicas de trabajo**

# Dónde y para qué se usan

<div style="float: left; width: 50%;">
* Aplicaciones bancarias
* Sistemas de control de stock
* Sistemas de archivos: journaling
* IoT: sistemas de iluminación
* __??????__
</div>

<img src="image/mr_x.png" style="float: right; margin-left: 1em; max-width: 50%">

# Qué hacen

* Garantizan consistencia e integridad de datos
* Garantizan el aislamiento de una unidad de trabajo
* Protegen ante fallas físicas y de software

![](image/acid.png)
 
# Cómo lo hacen

* Proveen distintos niveles de aislamiento
* Permiten cancelar una operación en progreso sin side effects
* Bloquean registros modificados

![](image/transaction-states.png)

# Bloqueo de registros

<div style="float: left; width: 70%;">
* __Bloqueo pesimista__: fuerza a que otras transacciones que quieran acceder a un registro tengan que esperar
* __Bloqueo optimista__: permite que otras transacciones ignoren los registros bloqueados
</div>

<img src="image/locking.png" style="float: right; margin-left: 1em; max-width: 30%">

# Referencias

* [Database Transactions - Wikipedia](https://en.wikipedia.org/wiki/Database_transaction)
* [ACID properties - Wikipedia](https://en.wikipedia.org/wiki/ACID)
* [Postgres Concurrency Control](https://www.postgresql.org/docs/current/mvcc.html)
* [Java Concurrency In Practice - Brian Goetz et al.](https://libgen.li/ads.php?md5=26544cc9a44791828d3c53cd03c07c35)

![](image/hasta_luego.png)
