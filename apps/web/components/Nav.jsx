import estilos from "./Nav.module.css";

// Server component: a nav não tem estado. Toda a legibilidade sobre o
// vídeo é resolvida por `mix-blend-mode` no CSS, sem JS de cor.

const SECOES = [
  { href: "#procedimentos", texto: "Procedimentos" },
  { href: "#resultados", texto: "Resultados" },
  { href: "#sobre", texto: "Sobre" },
];

export default function Nav() {
  return (
    <nav className={estilos.nav} aria-label="Principal">
      <a className={estilos.marca} href="#topo">
        Dra. Beatriz Lima <em>· Biomédica Esteta</em>
      </a>

      <div className={estilos.links}>
        {SECOES.map((s) => (
          <a key={s.href} className={estilos.link} href={s.href}>
            {s.texto}
          </a>
        ))}
      </div>

      <a className={estilos.contato} href="#contato">
        Agendar
      </a>
    </nav>
  );
}
