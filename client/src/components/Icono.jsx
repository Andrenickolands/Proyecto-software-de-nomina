// Íconos en SVG para no instalar otra librería
const trazos = {
  resumen: 'M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z',
  personas: 'M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 19v-1a4 4 0 0 0-3-3.8M16 3.2a3.5 3.5 0 0 1 0 6.6',
  reloj: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  nomina: 'M3 6h18v12H3zM3 10h18M7 15h3',
  mes: 'M4 5h16v15H4zM4 9h16M9 3v4M15 3v4M8 13h3M8 16h6',
  ajustes: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 4v4M10 10v4M18 16v4',
  sedes: 'M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6',
  salir: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  mas: 'M12 5v14M5 12h14',
  cerrar: 'M6 6l12 12M18 6L6 18',
  editar: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  borrar: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  imprimir: 'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z',
  descargar: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  candado: 'M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3',
  abrir: 'M6 11h12v9H6zM9 11V8a3 3 0 0 1 5.8-1',
  chispa: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6',
  menu: 'M4 7h16M4 12h16M4 17h16',
  alerta: 'M12 4l9 16H3zM12 10v4M12 17v.5',
  izq: 'M15 6l-6 6 6 6',
  der: 'M9 6l6 6-6 6',
  ojo: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  ojoTachado: 'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2',
};

export function Icono({ nombre, tam = 18, ...props }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d={trazos[nombre]} />
    </svg>
  );
}
