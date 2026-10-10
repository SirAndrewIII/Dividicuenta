import React from 'react';

const PREFIJO_GUARDADO = 'dividicuenta:v1:';

function borrarDatosGuardados() {
  try {
    Object.keys(window.localStorage)
      .filter((clave) => clave.startsWith(PREFIJO_GUARDADO))
      .forEach((clave) => window.localStorage.removeItem(clave));
  } catch {
    // sin acceso al almacenamiento: no hay nada que borrar
  }
}

// Evita la pantalla en blanco si algo falla al dibujar la app. Como la cuenta
// se guarda en el navegador, ofrece también empezar de cero por si un dato
// guardado fuera la causa del fallo.
export default class ErrorBoundary extends React.Component {
  state = { fallo: false };

  static getDerivedStateFromError() {
    return { fallo: true };
  }

  componentDidCatch(error) {
    console.error('Error al mostrar la app:', error);
  }

  render() {
    if (!this.state.fallo) return this.props.children;

    return (
      <div role="alert" className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-xl space-y-4">
          <h1 className="text-xl font-bold text-gray-800">Algo salió mal</h1>
          <p className="text-sm text-gray-600">
            No pudimos mostrar la pantalla. Puedes intentarlo de nuevo; si sigue fallando, empieza de cero
            (se borra lo que tenías cargado).
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              onClick={() => this.setState({ fallo: false })}
              className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Intentar de nuevo
            </button>
            <button
              onClick={() => {
                borrarDatosGuardados();
                window.location.reload();
              }}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Empezar de cero
            </button>
          </div>
        </div>
      </div>
    );
  }
}
