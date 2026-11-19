import Link from "next/link";

/** Error controlado cuando no se pueden leer los datos de un juego. */
export default function LoadError() {
  return (
    <div className="av-hall">
      <div className="hall-state error" role="alert">
        <div className="hs-title">NO SE PUDO CARGAR EL JUEGO</div>
        <p className="hs-text">
          Algo falló al leer los datos del juego y su ranking. Recarga la
          página en unos minutos.
        </p>
      </div>
      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/games" className="btn lg">
          VOLVER AL VAULT
        </Link>
      </div>
    </div>
  );
}
