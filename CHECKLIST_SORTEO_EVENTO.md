# Checklist Sorteo en Vivo (Evento Unico)

## 1) Preparacion (15-30 min antes)

- [ ] Confirmar que el sitio abre con candado en https://registro.synappssys.com
- [ ] Verificar pantalla publica: https://registro.synappssys.com/sorteo
- [ ] Verificar panel privado: https://registro.synappssys.com/sorteo/control
- [ ] Confirmar variable en Netlify: `RAFFLE_ADMIN_KEY` configurada
- [ ] Ejecutar SQL actualizado en Neon (tabla `event_raffle_winners`)
- [ ] Validar que hay participantes registrados en `event_prospects`
- [ ] Probar boton de sorteo en entorno real (solo 1 prueba, luego limpiar si aplica)

## 2) Montaje en evento (5 min antes)

- [ ] Proyectar solo la vista publica `/sorteo`
- [ ] Operar desde laptop en vista privada `/sorteo/control`
- [ ] Ingresar clave admin en privado (no compartir pantalla)
- [ ] Confirmar internet estable en equipo de control

## 3) Ejecucion del sorteo (en vivo)

- [ ] Anunciar reglas: 3 premios, seleccion aleatoria, validacion de identidad
- [ ] Presionar boton para Premio 1
- [ ] Validar ganador (ID + datos del registro)
- [ ] Presionar boton para Premio 2
- [ ] Validar ganador (ID + datos del registro)
- [ ] Presionar boton para Premio 3
- [ ] Validar ganador (ID + datos del registro)

## 4) Cierre y evidencia

- [ ] Tomar foto/video de pantalla de ganadores
- [ ] Guardar lista final de ganadores
- [ ] Recabar firma o acuse de entrega de premios
- [ ] Registrar incidencias (si hubo ausentes o descalificados)

## 5) Plan B rapido

- [ ] Si falla internet: usar hotspot del celular para panel privado
- [ ] Si falla proyector: leer ganadores desde panel privado
- [ ] Si un ganador no acredita datos: aplicar suplente segun bases

## URLs rapidas

- Publica: https://registro.synappssys.com/sorteo
- Privada: https://registro.synappssys.com/sorteo/control
