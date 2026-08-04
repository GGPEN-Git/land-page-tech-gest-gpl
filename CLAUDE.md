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

Por isso o cartão sempre à vista mostra **Validação** — é a legenda do que está pintado no mapa. `Estado` é estatística e vive na aba lateral. Se um dia o renderer de `CAMADA_DADOS` passar a ser por `Estado` no ArcGIS Online, os dois painéis devem trocar de sítio outra vez.

`MapaArcGIS` carrega o webmap, acrescenta só as camadas de `CAMADAS` que faltem (compara pelo URL normalizado com `urlCompletaDaCamada`, porque o SDK guarda o índice separado em `layerId`) e devolve a camada de dados via `onCamadaDados`.

Os assets do SDK (ícones, fontes) vêm do CDN via `esriConfig.assetsPath`. **Se atualizar `@arcgis/core`, atualize também `ARCGIS_VERSION`** — as duas versões têm de coincidir.

## Áreas e filtros

**A ÁREA não é um filtro como os outros.** As três áreas não vivem no mesmo sítio: `Boavista` e `Porto Seco da Mulemba` são valores do campo `AOI` dentro de `CAMADA_DADOS`; `Sambizanga` é uma **camada à parte**, cujo `AOI` está vazio. O mapeamento vive em `AREAS` (`lib/arcgis.ts`), e escolher uma área pode trocar a camada ativa — daí estar fora de `FILTROS`.

`CamadaConfig.filtroBase` é uma condição SQL aplicada **antes** de qualquer filtro do utilizador e que a interface não consegue remover. `CAMADA_DADOS` usa `AOI = 'Boavista'`: Porto Seco da Mulemba e os registos com `AOI` em branco não são desenhados nem contados. Entra em todas as consultas via o helper `comBase()` no `Dashboard`.

Consequências no `Dashboard`:
- `camadaAtivaId` decide qual camada é consultada e qual fica visível; as outras camadas de edifícios são ocultadas e têm o `definitionExpression` limpo.
- Mudar de área **limpa as restantes seleções** — os bairros de uma área não existem na outra.
- O cartão principal segue `campoSimbologia` da camada ativa: `Validacao` na de Boavista & Porto Seco, `Estado` na de Sambizanga. Sambizanga **não tem** o campo `Validacao`, por isso essas contagens são saltadas e o bloco "Estado" da aba desaparece (passaria a duplicar o cartão).

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
