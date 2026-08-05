import { MARCOS, avisoClinico } from "@/lib/tratamento";
import estilos from "./ColunaClinica.module.css";

const CORES_EQUIMOSE = {
  cedo: "var(--equimose-cedo)",
  meio: "var(--equimose-meio)",
  tarde: "var(--equimose-tarde)",
};

const LEGENDA_EQUIMOSE = {
  cedo: "Equimose no dia 2 — ameixa, e some sozinha.",
  meio: "Dia 5 — o roxo vira esverdeado. É o corpo reabsorvendo.",
  tarde: "Dia 7 a 10 — amarelo, a última fase antes de sumir.",
};

export default function ColunaClinica() {
  return (
    <div className={estilos.coluna}>
      {MARCOS.map((m) => (
        <section key={`${m.dia}-${m.p}`} className={estilos.bloco}>
          <span className={estilos.etapa}>
            Dia {String(m.dia).padStart(2, "0")} · {m.fase}
          </span>
          <h2 className={estilos.titulo}>{m.titulo}</h2>
          <p className={estilos.corpo}>{m.corpo}</p>

          {m.pontos.length > 0 && (
            <div className={estilos.ficha}>
              {m.pontos.map((p) => (
                <div key={p.n} className={estilos.ponto}>
                  <span className={estilos.numero}>{String(p.n).padStart(2, "0")}</span>
                  <span>
                    {p.regiao}
                    <br />
                    <span className={estilos.camada}>{p.camada}</span>
                  </span>
                  <span className={estilos.unidade}>{p.u} U</span>
                </div>
              ))}
            </div>
          )}

          {m.equimose && (
            <p className={estilos.equimose}>
              <span
                className={estilos.amostra}
                style={{ background: CORES_EQUIMOSE[m.equimose] }}
              />
              {LEGENDA_EQUIMOSE[m.equimose]}
            </p>
          )}
        </section>
      ))}

      <p className={estilos.aviso}>{avisoClinico}</p>
    </div>
  );
}
