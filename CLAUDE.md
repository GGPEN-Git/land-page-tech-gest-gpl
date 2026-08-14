# CLAUDE.md

Landing page do **TECH-GEST-GPL** (GEDAE / GGPEN). Site estático de página única, em português.

## Regras de trabalho (importante)

- **Não executo comandos de terminal.** Nada de `npm`, `git`, build, lint, dev server. Quando for preciso correr algo, escrevo o comando num bloco de código para o utilizador correr, e espero que ele cole o resultado.
- **Não verifico edições relendo ficheiros.** Se o Edit não deu erro, foi aplicado.
- **Não exploro o projeto sem necessidade.** Ir direto ao ficheiro indicado.
- O utilizador trata de git, commits, deploy e da verificação visual no browser.

## Stack

| | |
|---|---|
| Build | Vite 5 (`vite.config.ts`) |
| UI | React 18 + TypeScript 5.5 |
| Estilos | Tailwind CSS 3.4 |
| Animação | framer-motion 11 |
| Ícones | lucide-react |
| Classes | `clsx` + `tailwind-merge` via helper `cn()` |
| Mapas | `@arcgis/core` 4.31 (ArcGIS Maps SDK) |

## Deploy

**Render**, Web Service em Node, definido em `render.yaml` (blueprint).

| | |
|---|---|
| Build | `npm ci --include=dev && npx tsc --noEmit && npm run build` |
| Start | `node server.js` |
| Health check | `/healthz` |

`server.js` é um Express que serve `dist/`: cache imutável em `/assets`, fallback da SPA para `index.html`, e três cabeçalhos de segurança. Escuta em `process.env.PORT` — **nunca fixar a porta**, o Render atribui-a.

`--include=dev` no build é obrigatório: o Render define `NODE_ENV=production` e sem a flag o npm salta as devDependencies, ficando sem `vite` nem `typescript`.

O site é servido na **raiz** do domínio, por isso `BASE_PATH` não é definido e o `base` do Vite fica `/`. O suporte a subcaminho continua no `vite.config.ts` caso volte a ser preciso.

**Nunca escrever caminhos absolutos para ficheiros de `public/`.** Usar `asset("logo.png")` de `lib/utils.ts`, que prefixa com `import.meta.env.BASE_URL` e funciona seja qual for a base.

## Estrutura

```
index.html            → entry do Vite
public/               → imagens estáticas (ex.: /boavista_mapa.png)
src/
  index.tsx           → bootstrap do React
  index.css           → @tailwind + @layer base (fontes, body, headings)
  App.tsx             → router manual + secções da landing + CTA final inline
  lib/utils.ts        → cn() = twMerge(clsx(...))
  lib/arcgis.ts       → WEBMAP_ID, CAMADAS, ARCGIS_VERSION
  components/         → uma secção da página por ficheiro
    Navbar.tsx  Hero.tsx  Mission.tsx  HowItWorks.tsx
    Impact.tsx  Community.tsx  Footer.tsx
    Login.tsx         → portal de acesso (ecrã inteiro)
    Dashboard.tsx     → mapa + filtros + indicadores (ecrã inteiro)
    MapaArcGIS.tsx    → wrapper do MapView; expõe a view via onViewReady
    ui/Button.tsx     → único primitivo reutilizável
```

## Navegação

Não há `react-router`. `App.tsx` tem um `useState<"landing" | "login" | "dashboard">` e devolve cedo (`early return`) para `login` e `dashboard`; a landing é o fallback. O URL nunca muda.

`landing → login` via prop `onLogin` no `Hero` e o CTA final; `login → dashboard` via `onSuccess`; `dashboard → landing` via `onLogout`.

**Onde mexer:**
- Nova secção da landing page → novo ficheiro em `src/components/`, importado e posicionado em `App.tsx`.
- Novo ecrã completo → componente próprio + mais um valor no `view` de `App.tsx`.
- Elemento reutilizável (input, card, badge) → `src/components/ui/`.
- Ordem das secções → `App.tsx`.

## ArcGIS

Tudo configurado em `src/lib/arcgis.ts` — não espalhar URLs nem nomes de campos pelos componentes.

- Webmap: `56676e3af62748e29429492cafb1ed23` (portal ArcGIS Online)
- Portal: `services-eu1.arcgis.com/7r9gTPdSG9MPi1LZ`

O webmap tem **quatro** camadas operacionais:

| Camada | Papel |
|---|---|
| `RESIDENCIAS_EM_RISCO/FeatureServer/0` | **os dados** (`CAMADA_DADOS`) — Boavista & Porto Seco, 64 campos |
| `Residencias_em_Risco_Sambizanga/FeatureServer/0` | outro conjunto de edifícios; `AOI`, `Tipologia`, `T_Constru` e `Afetacao` estão vazios — **não serve para filtrar** |
| `Boavista/FeatureServer/0` | contorno da área, sem atributos |
| `Porto_Seco_Mulemba/FeatureServer/0` | contorno da área, sem atributos |

Campos usados pela UI: `AOI`, `Bairro`, `Tipologia`, `T_Constru`, `Afetacao`, `Estado`, `Validacao`.

Domínios (inteiros): `Estado` → `0 Não Inscrito`, `1 Pendente`, `2 Inscrito`. `Validacao` → `0 Outros`, `1 Primária`, `2 Secundária`.

Valores de `AOI`: `Boavista`, `Porto Seco da Mulemba` e `" "` (espaço) — as opções em branco são descartadas com `trim()`.

### Simbologia

As cores de `ESTADOS` e `VALIDACOES` são cópias dos renderers do webmap, não escolhas de design — mexer nelas desalinha a legenda do que está desenhado no mapa.

Atenção: cada camada é desenhada por um campo diferente. `CAMADA_DADOS` (Boavista & Porto Seco) usa um renderer por **`Validacao`**; a camada de Sambizanga usa um renderer por **`Estado`**.

A camada de Sambizanga tem `Estado = 0` em todos os 1517 registos, pelo que o seu renderer a pinta inteiramente de vermelho. Como não entra nos filtros nem nas contagens, arranca oculta (`visivelPorOmissao: false`) e liga-se na secção **Camadas** da aba. `Boavista` e `Porto_Seco_Mulemba` têm 1 polígono cada — são contornos de área, não edifícios.

O seletor **Colorir mapa por** tem três modos:

| Modo | Efeito |
|---|---|
| **Webmap** (omissão) | Mantém o renderer do ArcGIS Online. Alterações de simbologia feitas no portal aparecem sem tocar no código |
| **Estado** | `UniqueValueRenderer` construído por `lib/simbologia.ts` a partir de `ESTADOS` |
| **Validação** | Idem, a partir de `VALIDACOES`. Indisponível quando Sambizanga está ativa |

Os renderers originais são guardados em `renderersOriginaisRef` na primeira vez que cada camada é vista, e repostos ao voltar a "Webmap".

**A legenda lê cores e rótulos do renderer em uso**, via `lerLegenda()`. Os valores em `ESTADOS`/`VALIDACOES` passam a servir de reserva, para o caso de o renderer não ser por valor único. Se alguém mudar a simbologia ou os rótulos no ArcGIS Online, o cartão acompanha sozinho.

O que continua a vir do código é a **lista de valores contados** (`0`, `1`, `2`). Um valor novo no domínio não é contado até ser acrescentado a `ESTADOS`/`VALIDACOES`.

### Edição (`ModuloEdicao.tsx`)

**A única parte da aplicação que escreve no ArcGIS.** Usa o widget `Editor` sobre a camada ativa. Só admin, e só com uma área escolhida.

`addEnabled: false` e `deleteEnabled: false` — só se **alteram** feições existentes. São registos de um levantamento oficial, e a interface não teria como desfazer um apagar nem um polígono desenhado por engano.

A aplicação não está autenticada no portal, portanto as edições vão como **anónimas**. Funciona porque o serviço tem `Create,Update,Delete` nas capacidades e `allowAnonymousToUpdate: true` — o que também significa que qualquer pessoa na internet o consegue fazer, com ou sem esta aplicação.

Atenção ao `filtroBase`: um edifício criado sem `AOI = 'Boavista'` fica invisível no painel, porque o `definitionExpression` o exclui.

### Modo Controlo

Quarto modo do seletor, **só para admin**. Grava no campo **`GGPEN_Controlo`** da camada, um inteiro editável **sem domínio definido no portal** — os códigos são convenção nossa, em `arcgis.ts`:

| Valor | Estado |
|---|---|
| `1` | Validado |
| `2` | Não validado |
| `0` ou `null` | Por verificar |

São **três estados**. "Por verificar" é o de partida e também o de quem viu o polígono e o deixou para uma segunda passagem — por isso apanha o zero e o nulo, tanto no renderer (símbolo por omissão) como na contagem (`condicaoControlo`).

Clicar seleciona; a gravação é por botão, com `applyEdits`. Escreve no ArcGIS Online — é, com o `ModuloEdicao`, a única parte da aplicação que o faz.

Só aparece com **uma área escolhida** e se a camada declarar o campo (Sambizanga não o tem).

**Se o portal vier a atribuir um domínio a este campo, os códigos têm de coincidir.**

Por isso `MapaArcGIS` faz `load()` em **todas** as camadas configuradas: sem estarem carregadas, `layer.renderer` ainda não existe e não há nada para ler.

**O que reflete automaticamente do ArcGIS Online:** dados (registos, atributos), simbologia no modo Webmap, mapa de fundo, enquadramento inicial, e camadas acrescentadas ao webmap (são desenhadas, mas só entram em filtros e contagens depois de registadas em `CAMADAS`).

**O que não reflete:** os rótulos e cores em `ESTADOS`/`VALIDACOES`, que estão escritos no código.

`MapaArcGIS` carrega o webmap, acrescenta só as camadas de `CAMADAS` que faltem (compara pelo URL normalizado com `urlCompletaDaCamada`, porque o SDK guarda o índice separado em `layerId`) e devolve a camada de dados via `onCamadaDados`.

Os assets do SDK (ícones, fontes) vêm do CDN via `esriConfig.assetsPath`. **Se atualizar `@arcgis/core`, atualize também `ARCGIS_VERSION`** — as duas versões têm de coincidir.

## Áreas e filtros

**A ÁREA não é um filtro como os outros.** As três áreas não vivem no mesmo sítio: `Boavista` e `Porto Seco da Mulemba` são valores do campo `AOI` dentro de `CAMADA_DADOS`; `Sambizanga` é uma **camada à parte**, cujo `AOI` está vazio. O mapeamento vive em `AREAS` (`lib/arcgis.ts`), e escolher uma área pode trocar a camada ativa — daí estar fora de `FILTROS`.

`CamadaConfig.filtroBase` é uma condição SQL aplicada **antes** de qualquer filtro do utilizador e que a interface não consegue remover. `CAMADA_DADOS` usa `AOI = 'Boavista'`: Porto Seco da Mulemba e os registos com `AOI` em branco não são desenhados nem contados. Entra em todas as consultas via o helper `comBase()` no `Dashboard`.

Consequências no `Dashboard`:
- `configsAtivas` é o conjunto de camadas de edifícios em uso. Com uma área escolhida é uma só; **sem área ("Todas") são as duas, e as contagens somam-se**. As camadas fora do conjunto ficam ocultas e com o `definitionExpression` limpo.
- Cada camada aplica o **seu** `filtroBase` — daí o helper `whereDe(config)` em vez de um `where` único.
- Mudar de área **limpa as restantes seleções** — os bairros de uma área não existem na outra.
- As opções de cada filtro são a **união** dos valores distintos de todas as camadas ativas.

O cartão principal:

| Área | Cartão | Bloco da aba |
|---|---|---|
| Boavista | Validação | Estado |
| Sambizanga e novas áreas | Estado | — |
| Todas (soma) | Estado | Validação, só de Boavista |

Com as duas camadas somadas o cartão passa a `Estado` porque é o **único campo que existe em ambas** — Sambizanga não tem `Validacao`. Somar validações das duas seria somar peras com maçãs.

Restantes filtros: `selecoes` é `Record<campo, valor>`. `construirWhere(selecoes)` gera o SQL; `construirWhere(selecoes, campo)` ignora um campo para listar as suas próprias opções sem se auto-filtrar (filtros em cascata).

O mesmo `where` alimenta três coisas: `camada.definitionExpression` (filtra o mapa), as contagens por `Estado` (cartão à direita) e as contagens por `Validacao` (aba lateral). Valores vão para SQL — passar sempre por `escaparSql`, e juntar condições com `comCondicao` para não deixar `1=1` pendurado.

## Layout do Dashboard

O `<main>` é um flex row: aba lateral (largura animada de 0 a `LARGURA_ABA`), puxador, e o mapa em `flex-1`. A aba **não** flutua sobre o mapa — encolhe-o, e o `MapView` reajusta-se sozinho à mudança de tamanho do contentor.

O único elemento por cima do mapa é a legenda de validação, no canto inferior direito, e é intencional: é a legenda do que está desenhado.

## Autenticação

Real, contra Postgres. Não há registo aberto: a primeira conta nasce por linha de comando, as seguintes são criadas por um administrador dentro da aplicação.

```
docker compose up -d       # Postgres local na 5433 (ou aponte a DATABASE_URL ao Supabase)
npm run db:migrar          # aplica db/schema.sql
npm run db:semear          # cria admin + utilizador, imprime as senhas UMA vez
npm run dev:api            # Express na 3000
npm run dev                # Vite na 5173, com proxy /api → 3000
```

O TLS da ligação é decidido pelo **destino** e não pelo `NODE_ENV` (`precisaDeTls` em `server/db.js`): assim funciona contra o Supabase a partir da máquina local e fica desligado no Docker.

### Papéis

`utilizadores.papel` é `admin` ou `utilizador`. Só `admin` acede a `/api/utilizadores` (listar, criar, ativar/desativar, promover).

O botão de gestão no `Dashboard` aparece conforme o papel, mas isso é **conveniência, não segurança** — quem decide é o `exigirAdmin` no servidor, que lê o papel da base de dados a cada pedido.

Um admin não se pode desativar nem despromover a si próprio; sem isso seria possível ficar sem nenhum administrador.

Alterar palavra-passe, papel ou desativar **apaga as sessões abertas** desse utilizador. Sem isso, quem já estivesse autenticado mantinha o acesso antigo.

| Ficheiro | Papel |
|---|---|
| `db/schema.sql` | Tabelas `utilizadores` e `sessoes`. Idempotente |
| `server/db.js` | Pool do `pg`. SSL só em produção |
| `server/auth.js` | scrypt, criação e validação de sessões, opções do cookie |
| `server/rotas.js` | `POST/GET/DELETE /api/sessao` e a trava de tentativas |
| `src/lib/api.ts` | Cliente do frontend; todos os pedidos com `credentials: "include"` |
| `components/MenuConta.tsx` | Menu da conta na barra do dashboard |
| `verificacoes` (tabela) | Controlo de polígonos verificados; `GET/PUT /api/controlo` |
| `components/Utilizadores.tsx` | Painel de funcionários e acessos (só admin) |
| `components/AlterarPalavraPasse.tsx` | Alteração da própria palavra-passe |

Alterar a própria palavra-passe **exige a atual** (`PATCH /api/eu/palavra-passe`), mesmo havendo sessão válida — um cookie roubado não deve permitir tomar a conta. Fecha as outras sessões e mantém a de quem está a alterar.

Decisões que não se devem inverter sem pensar:

- **Sessão em cookie `httpOnly`**, não JWT em `localStorage`. O token nunca é acessível a JavaScript, portanto um XSS não o rouba.
- **Na base de dados guarda-se o SHA-256 do token**, não o token. Uma leitura indevida da tabela `sessoes` não dá acesso a nada.
- **Palavras-passe com `crypto.scrypt`** da biblioteca padrão. Evita o `bcrypt`, que é dependência nativa e complica o build no Render.
- **A mesma mensagem de erro** para email inexistente e palavra-passe errada — distinguir permitiria descobrir que emails estão registados.
- **A API é montada antes dos estáticos** no `server.js`; ao contrário, o fallback da SPA responderia `index.html` a `/api` inexistentes.

A trava de tentativas em `rotas.js` é em memória: chega para força bruta simples, mas reinicia com o processo e não é partilhada entre instâncias. Se o serviço escalar, passa a precisar de Redis ou de uma tabela.

## Convenções

- **Named exports**, nunca `export default`: `export function Hero() {}`. Ficheiro em `PascalCase.tsx` com o mesmo nome do componente.
- Props tipadas com `interface XProps`, estendendo o tipo HTML nativo quando aplicável (ver `ui/Button.tsx`).
- Imports relativos (`../lib/utils`) — não há alias `@/` configurado.
- **Não importar `React` só por importar.** O `jsx: react-jsx` dispensa-o, e `noUnusedLocals` no `tsconfig.json` transforma isso em erro de compilação. Importar apenas quando se usa `React.ReactNode`, `React.FormEvent`, etc.
- Componentes que envolvem `motion.*` devem estender `HTMLMotionProps<"tag">`, nunca os atributos nativos do React — o framer-motion redefine `onDrag` e `onAnimationStart` de forma incompatível.
- `npm run build` **não** valida tipos. Correr `npx tsc --noEmit` antes de fazer push; é o que o Render executa e o que faz o deploy falhar.
- Cada secção é uma `<section>` com `container mx-auto px-4 md:px-6` por dentro.
- Espaçamento vertical típico das secções: `py-20`.
- Mobile-first: base sem prefixo, depois `md:` / `sm:`.
- Texto visível ao utilizador em **português**.

## Paleta

Cores fora do tema Tailwind, escritas em hex arbitrário (`bg-[#...]`):

| Cor | Uso |
|---|---|
| `#c43d3d` | vermelho — botão primary |
| `#754040` | hover do primary |
| `#c4b03d` | dourado — botão secondary |
| `#4d221a` | castanho escuro — fundo do CTA final |
| `#c4703d` | terracota — `selection:` |
| `#1a4d2e` | verde — outline, ghost, focus ring |

Neutros: escala `stone` do Tailwind (`bg-stone-50`, `text-stone-900`).

## Nota conhecida

`src/index.css` importa **Inter** e **Playfair Display** do Google Fonts, mas `tailwind.config.js` não tem `theme.extend.fontFamily`. Logo `font-sans` e `font-serif` continuam a resolver para os defaults do Tailwind e as fontes importadas **não estão a ser aplicadas**. Para corrigir, estender o config:

```js
theme: { extend: { fontFamily: {
  sans: ['Inter', 'sans-serif'],
  serif: ['"Playfair Display"', 'serif'],
} } }
```

## Comandos (para o utilizador correr)

```
npm run dev       # servidor local
npm run build     # build de produção → dist/
npm run preview   # serve o build
npm run lint      # eslint
npx tsc --noEmit  # só type-check
```
