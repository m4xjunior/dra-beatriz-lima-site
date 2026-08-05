#!/usr/bin/env python3
"""
Pipeline da galeria antes/depois — Dra. Beatriz Lima.

INTENÇÃO (por que existe, não como funciona):

As fotos chegam do WhatsApp em três formatos misturados: par empilhado
(antes em cima), par lado a lado (antes à esquerda) e foto avulsa. Cada
uma numa dimensão diferente — 635x1130 até 1600x1600. Jogar isso direto
num grid dá um mosaico irregular, que é exatamente o que o Max recusou.

A regra que este script implementa: NUNCA distorcer e NUNCA cortar rosto
por acidente. Então ele faz duas coisas separadas:

 1. SEPARA os pares combinados em `antes` e `depois` individuais. A costura
    é detectada pela linha/coluna de maior descontinuidade perto do centro
    (as duas fotos de um par nunca casam pixel a pixel na emenda), em vez
    de assumir metade exata — nos originais o corte real fica em 0.49~0.51.

 2. NÃO corta para um formato fixo. Gera derivados na proporção nativa e
    grava no manifest a `object-position` de cada foto. O grid usa
    aspect-ratio fixo + object-fit:cover no CSS, então o cartão fica
    uniforme sem que nenhum pixel seja esticado. Cortar aqui seria
    destrutivo e irreversível; cortar no CSS é ajustável.

Saída: derivados WebP+AVIF em 2 larguras + manifest.json consumido pelo
content collection `galeria` do Astro.

Uso:  python3 scripts/galeria/processar.py
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
ORIGEM = Path.home() / "Downloads"
TRABALHO = RAIZ / "scripts" / "galeria" / "_trabalho"
SAIDA = RAIZ / "scripts" / "galeria" / "_saida"
MANIFEST = RAIZ / "apps" / "site" / "src" / "content" / "galeria" / "manifest.json"

# Larguras servidas. 720 cobre o cartão do grid em telas retina até ~360px
# de largura de cartão; 1440 cobre o lightbox em desktop 2x. Uma terceira
# largura não paga o custo de armazenamento — os cartões nunca passam de
# 640px de CSS no layout de 3 colunas.
LARGURAS = (720, 1440)


@dataclass
class Fonte:
    """Uma foto original recebida, com o que ela é clinicamente."""

    arquivo: str
    slug: str
    procedimento: str
    legenda: str
    # 'empilhado' = antes em cima | 'lado-a-lado' = antes à esquerda
    # 'avulsa'    = foto única    | 'composto'    = par já diagramado, não separar
    formato: str
    # Ponto de interesse do enquadramento, em % — vira object-position no CSS.
    foco: str = "50% 50%"
    # Só para 'avulsa': marca se é o antes ou o depois de um par cujos
    # lados chegaram como arquivos separados.
    papel: str | None = None
    par: str | None = None
    derivados: dict = field(default_factory=dict)


# Inventário curado à mão. São 10 arquivos — detecção automática de
# procedimento seria adivinhação, e adivinhar procedimento clínico numa
# galeria de resultados é o tipo de erro que não pode acontecer.
FONTES: list[Fonte] = [
    Fonte(
        arquivo="WhatsApp Image 2026-08-05 at 01.41.19 (1).jpeg",
        slug="labial-frontal",
        procedimento="preenchimento-labial",
        legenda="Preenchimento labial — vista frontal",
        formato="empilhado",
        foco="50% 55%",
    ),
    Fonte(
        arquivo="WhatsApp Image 2026-08-05 at 01.41.19.jpeg",
        slug="labial-perfil",
        procedimento="preenchimento-labial",
        legenda="Preenchimento labial — vista de três quartos",
        formato="lado-a-lado",
        foco="50% 60%",
    ),
    Fonte(
        arquivo="WhatsApp Image 2026-08-05 at 01.41.19 (2).jpeg",
        slug="full-face-terco-medio",
        procedimento="preenchimentos-full-face",
        legenda="Preenchimento full face — terço médio",
        formato="empilhado",
        foco="50% 45%",
    ),
    Fonte(
        arquivo="WhatsApp Image 2026-08-05 at 01.41.20.jpeg",
        slug="pele-renovada",
        procedimento="limpeza-de-pele",
        legenda="Protocolo de pele — resultado após a primeira sessão",
        formato="composto",
        foco="50% 40%",
    ),
    Fonte(
        arquivo="WhatsApp Image 2026-08-05 at 01.59.43 (1).jpeg",
        slug="toxina-frontal",
        procedimento="toxina-botulinica",
        legenda="Toxina botulínica — linhas frontais em contração",
        formato="avulsa",
        papel="antes",
        par="toxina-frontal",
        foco="50% 35%",
    ),
    Fonte(
        arquivo="WhatsApp Image 2026-08-05 at 01.59.43.jpeg",
        slug="toxina-frontal",
        procedimento="toxina-botulinica",
        legenda="Toxina botulínica — linhas frontais em contração",
        formato="avulsa",
        papel="depois",
        par="toxina-frontal",
        foco="50% 35%",
    ),
    Fonte(
        arquivo="WhatsApp Image 2026-08-05 at 01.58.43.jpeg",
        slug="pele-textura",
        procedimento="peelings",
        legenda="Peeling — textura e uniformidade da pele",
        formato="avulsa",
        papel="antes",
        par="pele-textura",
        foco="45% 50%",
    ),
    Fonte(
        arquivo="WhatsApp Image 2026-08-05 at 01.58.43 (1).jpeg",
        slug="pele-textura",
        procedimento="peelings",
        legenda="Peeling — textura e uniformidade da pele",
        formato="avulsa",
        papel="depois",
        par="pele-textura",
        foco="45% 50%",
    ),
    Fonte(
        arquivo="WhatsApp Image 2026-08-05 at 01.58.47.jpeg",
        slug="perfiloplastia-contorno",
        procedimento="perfiloplastia",
        legenda="Perfiloplastia — definição de contorno mandibular",
        formato="avulsa",
        papel="antes",
        par="perfiloplastia-contorno",
        foco="50% 45%",
    ),
    Fonte(
        arquivo="WhatsApp Image 2026-08-05 at 01.58.47 (1).jpeg",
        slug="perfiloplastia-contorno",
        procedimento="perfiloplastia",
        legenda="Perfiloplastia — definição de contorno mandibular",
        formato="avulsa",
        papel="depois",
        par="perfiloplastia-contorno",
        foco="50% 45%",
    ),
]


def achar_costura(img: Image.Image, eixo: str) -> int:
    """Localiza a emenda entre as duas fotos de um par combinado.

    Percorre só a faixa central (±6%) e devolve a linha/coluna onde o
    salto de luminância entre vizinhas é maior. Duas fotos distintas
    coladas quase sempre produzem um pico nítido ali; se não produzirem,
    o meio exato continua sendo a resposta certa.
    """
    cinza = img.convert("L")
    w, h = cinza.size
    total = h if eixo == "y" else w
    meio = total // 2
    janela = max(4, int(total * 0.06))
    inicio, fim = meio - janela, meio + janela

    px = cinza.load()
    outro = w if eixo == "y" else h
    passo = max(1, outro // 160)  # amostragem: 160 pontos bastam

    def linha(i: int) -> list[int]:
        if eixo == "y":
            return [px[x, i] for x in range(0, w, passo)]
        return [px[i, y] for y in range(0, h, passo)]

    melhor_i, melhor_d = meio, -1.0
    anterior = linha(inicio)
    for i in range(inicio + 1, fim):
        atual = linha(i)
        d = sum(abs(a - b) for a, b in zip(atual, anterior)) / len(atual)
        if d > melhor_d:
            melhor_d, melhor_i = d, i
        anterior = atual
    return melhor_i


def separar(img: Image.Image, formato: str) -> dict[str, Image.Image]:
    """Devolve {'antes':…, 'depois':…} conforme o formato do original."""
    w, h = img.size
    if formato == "empilhado":
        y = achar_costura(img, "y")
        return {"antes": img.crop((0, 0, w, y)), "depois": img.crop((0, y, w, h))}
    if formato == "lado-a-lado":
        x = achar_costura(img, "x")
        return {"antes": img.crop((0, 0, x, h)), "depois": img.crop((x, 0, w, h))}
    return {"unico": img}


def harmonizar(partes: dict[str, Image.Image], foco: str) -> dict[str, Image.Image]:
    """Iguala a proporção dos dois lados de um comparativo.

    Quando antes e depois chegaram como arquivos separados, eles vêm com
    enquadramentos diferentes — 1200x1600 contra 635x1130, por exemplo.
    Sobrepor isso num slider mostra duas molduras distintas e a paciente
    lê a diferença de moldura como diferença de resultado. Comparação
    clínica exige a MESMA janela nos dois lados.

    Corta ambos para a proporção mais estreita do par, ancorando no ponto
    de interesse declarado (`foco`) em vez do centro geométrico, que num
    retrato costuma cair no queixo.
    """
    if len(partes) < 2:
        return partes

    fx, fy = (float(v.strip().rstrip("%")) / 100 for v in foco.split())
    alvo = min(w / h for w, h in (p.size for p in partes.values()))

    saida = {}
    for papel, img in partes.items():
        w, h = img.size
        if abs(w / h - alvo) < 0.005:
            saida[papel] = img
            continue
        if w / h > alvo:          # largo demais → cortar nas laterais
            nova_w, nova_h = round(h * alvo), h
        else:                     # alto demais → cortar em cima/embaixo
            nova_w, nova_h = w, round(w / alvo)
        x = max(0, min(w - nova_w, round(w * fx - nova_w / 2)))
        y = max(0, min(h - nova_h, round(h * fy - nova_h / 2)))
        saida[papel] = img.crop((x, y, x + nova_w, y + nova_h))
    return saida


def gerar_derivados(img: Image.Image, base: str) -> list[dict]:
    """Grava WebP + AVIF nas larguras servidas, na proporção nativa."""
    SAIDA.mkdir(parents=True, exist_ok=True)
    saidas = []
    w0, h0 = img.size
    for largura in LARGURAS:
        if largura > w0:
            # Não upscale — inventar pixel em foto clínica é falsear resultado.
            largura = w0
        # Dimensões pares obrigatórias: o SVT-AV1 faz padding sozinho para
        # múltiplo de 2 e o padding MUDA a proporção (720x900 vira 720x904).
        # Arredondar aqui mantém o AVIF e o WebP com o mesmo enquadramento.
        largura -= largura % 2
        altura = round(h0 * largura / w0)
        altura -= altura % 2
        red = img.resize((largura, altura), Image.LANCZOS)

        png = TRABALHO / f"{base}-{largura}.png"
        red.save(png)

        webp = SAIDA / f"{base}-{largura}.webp"
        subprocess.run(
            ["cwebp", "-q", "82", "-m", "6", "-quiet", str(png), "-o", str(webp)],
            check=True,
        )

        avif = SAIDA / f"{base}-{largura}.avif"
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", str(png),
             "-c:v", "libsvtav1", "-crf", "34", "-preset", "5",
             "-pix_fmt", "yuv420p10le", "-frames:v", "1", "-f", "avif",
             str(avif)],
            check=True,
            stderr=subprocess.DEVNULL,
        )

        saidas.append({"largura": largura, "altura": altura,
                       "webp": webp.name, "avif": avif.name})
        png.unlink()
        if largura == w0:
            break  # já chegou no tamanho nativo, não gerar duplicata
    return saidas


def main() -> int:
    faltando = [f.arquivo for f in FONTES if not (ORIGEM / f.arquivo).exists()]
    if faltando:
        print("Originais não encontrados em ~/Downloads:", file=sys.stderr)
        for f in faltando:
            print(f"  · {f}", file=sys.stderr)
        return 1

    if TRABALHO.exists():
        shutil.rmtree(TRABALHO)
    TRABALHO.mkdir(parents=True)
    if SAIDA.exists():
        shutil.rmtree(SAIDA)
    SAIDA.mkdir(parents=True)

    itens: dict[str, dict] = {}
    bitmaps: dict[str, dict[str, Image.Image]] = {}
    origens: dict[str, dict[str, str]] = {}

    # Passo 1 — abrir e separar. Nada é escrito ainda: a harmonização do
    # passo 2 precisa dos dois lados do par na mão para escolher a janela.
    for fonte in FONTES:
        img = Image.open(ORIGEM / fonte.arquivo).convert("RGB")
        chave = fonte.par or fonte.slug
        itens.setdefault(chave, {
            "slug": chave,
            "procedimento": fonte.procedimento,
            "legenda": fonte.legenda,
            "foco": fonte.foco,
            "tipo": "composto" if fonte.formato == "composto" else "comparativo",
            "lados": {},
        })
        partes = ({fonte.papel or "unico": img} if fonte.formato == "avulsa"
                  else separar(img, fonte.formato))
        bitmaps.setdefault(chave, {}).update(partes)
        for papel in partes:
            origens.setdefault(chave, {})[papel] = fonte.arquivo

    # Passo 2 — igualar a moldura dos comparativos e gravar os derivados.
    for chave, partes in bitmaps.items():
        antes_de = {p: img.size for p, img in partes.items()}
        partes = harmonizar(partes, itens[chave]["foco"])
        for papel, parte in partes.items():
            base = f"{chave}-{papel}"
            marca = "" if antes_de[papel] == parte.size else f"  (era {antes_de[papel][0]}x{antes_de[papel][1]})"
            print(f"  · {base}  {parte.size[0]}x{parte.size[1]}{marca}")
            itens[chave]["lados"][papel] = {
                "origem": origens[chave][papel],
                "nativo": {"largura": parte.size[0], "altura": parte.size[1]},
                "derivados": gerar_derivados(parte, base),
            }
        # A proporção final do item — o CSS usa isso para reservar espaço
        # e zerar layout shift antes da imagem chegar.
        w, h = next(iter(partes.values())).size
        itens[chave]["proporcao"] = round(w / h, 4)

    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(
        json.dumps({"base": "https://storage.googleapis.com/dra-beatriz-lima-estetica/galeria/",
                    "itens": list(itens.values())}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    shutil.rmtree(TRABALHO)

    print(f"\n{len(itens)} itens · {len(list(SAIDA.iterdir()))} arquivos em {SAIDA}")
    print(f"manifest → {MANIFEST}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
