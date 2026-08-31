# TECH-GEST: GPL

Plataforma de visualização e gestão do levantamento de residências em áreas de risco, para o **Governo Provincial de Luanda**. Desenvolvida pelo **GGPEN / GEDAE**.

O site tem uma **página de apresentação** pública e, atrás do login, **três módulos**: o painel do mapa, o cadastro de Luanda e os indicadores do levantamento.

---

## Índice

- [Arranque rápido](#arranque-rápido)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Navegação](#navegação)
- [Os dados](#os-dados)
- [Módulo 1 — Painel do mapa](#módulo-1--painel-do-mapa)
- [Módulo 2 — Cadastro de Luanda](#módulo-2--cadastro-de-luanda)
- [Módulo 3 — Indicadores do levantamento](#módulo-3--indicadores-do-levantamento)
- [Autenticação](#autenticação)
- [Deploy](#deploy)
- [Convenções de código](#convenções-de-código)
- [Tarefas comuns](#tarefas-comuns)
- [Limitações conhecidas](#limitações-conhecidas)

---

## Arranque rápido

Requisitos: **Node 20** e acesso a um Postgres (Docker local ou Supabase).

```bash
npm install
cp .env.example .env          # e preencher a DATABASE_URL
```

**Com Postgres local em Docker:**

```bash
docker compose up -d          # Postgres na porta 5435
```

A porta é 5435 e não a 5432 habitual porque 5432, 5433 e 5434 já estão ocupadas por outros projetos na máquina de desenvolvimento. A imagem é `postgres:16` e não a variante `alpine`, que devolveu `exec format error` nessa máquina.

**Ou apontar a `DATABASE_URL` a um Supabase existente.** O TLS é decidido pelo destino e não pelo `NODE_ENV` (`precisaDeTls`, em `server/db.js`): funciona contra o Supabase a partir do portátil e fica desligado contra o Docker.

Depois:

```bash
npm run db:migrar             # cria as tabelas
npm run db:semear             # cria admin + utilizador, imprime as senhas UMA vez
```

E dois terminais em simultâneo:

```bash
npm run dev:api               # API Express na 3000
npm run dev                   # Vite na 5173, com proxy /api → 3000
```

Abrir `http://localhost:5173`.

> Se o login der "Ocorreu um erro inesperado", quase de certeza é o `npm run dev:api` que não está a correr: o proxy do Vite devolve HTML, e o cliente falha ao interpretá-lo como JSON.

### Todos os comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (frontend) |
| `npm run dev:api` | API Express, com recarregamento automático |
| `npm run build` | Compila para `dist/` |
| `npm run preview` | Serve o build |
| `npm start` | Serve `dist/` + API, como em produção |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | **Verificação de tipos** |
| `npm run db:migrar` | Aplica `db/schema.sql` |
| `npm run db:semear` | Cria as contas iniciais |
| `npm run db:utilizador` | Cria ou atualiza uma conta |

> **`npm run build` não verifica tipos.** O Vite transpila sem conferir. Corra sempre `npx tsc --noEmit` antes de fazer push — é o que o Render executa e o que faz falhar o deploy. O `noUnusedLocals` do `tsconfig.json` transforma um import por usar em **erro de compilação**, e é a causa mais frequente de builds falhados aqui.

---

## Variáveis de ambiente

| Variável | Obrigatória | Para quê |
|---|---|---|
| `DATABASE_URL` | sim | Ligação ao Postgres |
| `NODE_ENV` | em produção | Decide o `secure` do cookie de sessão |
| `NODE_VERSION` | no Render | Fixa o Node em 20 |
| `PORT` | não | Atribuída pelo Render; 3000 em local |
| `SESSAO_DIAS` | não | Validade da sessão. Omissão: 7 |
| `ADMIN_EMAIL`, `ADMIN_SENHA` | semeadura | Conta de administrador inicial |
| `UTILIZADOR_EMAIL`, `UTILIZADOR_SENHA` | semeadura | Conta normal inicial |

**Com Supabase**, use a connection string do **Session pooler** (`...pooler.supabase.com:5432`), não a ligação direta — esta última resolve para IPv6 e o Render não lhe chega.

> Nada de segredos em variáveis com prefixo `VITE_`: essas ficam escritas em texto simples no JavaScript publicado.

---

## Estrutura do projeto

```
index.html              entrada do Vite
public/                 imagens estáticas (logos, mapa de fundo da landing)
db/schema.sql           tabelas: utilizadores, sessoes, verificacoes
scripts/                migrar.js · semear.js · criar-utilizador.js
server.js               Express: API + ficheiros estáticos + /healthz
server/
  db.js                 pool do Postgres; TLS decidido pelo destino
  auth.js               scrypt, sessões, opções do cookie
  rotas.js              endpoints /api e a trava de tentativas
src/
  App.tsx               navegação entre as cinco vistas
  index.css             Tailwind, fontes, e a folha de impressão (PDF)
  lib/
    arcgis.ts           camadas, campos, domínios, cores, SQL — módulo do mapa
    luanda.ts           idem, para o módulo de Luanda
    simbologia.ts       renderers e leitura da legenda
    conformidade.ts     port em TS da expressão Arcade do webmap
    estatisticas.ts     cálculo dos indicadores e leitura do campo Tipologia
    graficos.ts         paleta validada, escalas e geometria das barras
    api.ts              cliente da API
    utils.ts            cn() e asset()
  components/
    Navbar Hero Mission HowItWorks Impact Community Footer   landing
    Login.tsx           portal de acesso
    Dashboard.tsx       painel do mapa: filtros, indicadores, controlo
    MapaArcGIS.tsx      wrapper do MapView do painel principal
    ModuloEdicao.tsx    widget Editor do ArcGIS, só admin
    PainelLuanda.tsx    módulo Cadastro de Luanda
    MapaLuanda.tsx      mapa próprio desse módulo
    PainelEstatisticas.tsx   módulo Indicadores do levantamento
    MenuConta.tsx       menu da conta na barra
    Utilizadores.tsx    gestão de acessos (admin)
    AlterarPalavraPasse.tsx
    ui/
      Button.tsx
      BarrasHorizontais.tsx    gráfico de barras de uma série
      ColunasAgrupadas.tsx     gráfico de colunas de duas séries
```

---

## Navegação

Não há `react-router`. O `App.tsx` tem um `useState<"landing" | "login" | "dashboard" | "luanda" | "estatisticas">` e devolve cedo para cada vista; a landing é o caso por omissão. **O URL nunca muda** — o que significa que os módulos não são endereçáveis, e que esconder um botão é a única forma de os tornar inalcançáveis.

```
landing ──onLogin──▶ login ──onSuccess──▶ dashboard ──┬─▶ luanda
                                                       └─▶ estatisticas
```

**Onde mexer:**

| Quero… | Vou a |
|---|---|
| Nova secção da landing | novo ficheiro em `src/components/`, posicionado em `App.tsx` |
| Novo ecrã completo | componente próprio + mais um valor no `view` de `App.tsx` |
| Elemento reutilizável | `src/components/ui/` |
| Ordem das secções | `App.tsx` |

---

## Os dados

Vivem no **ArcGIS Online**, não neste projeto. Os webmaps definem que camadas se desenham, por que ordem e com que cores; os polígonos vêm dos serviços em `services-eu1.arcgis.com/7r9gTPdSG9MPi1LZ`.

### Camadas do painel principal

Webmap `56676e3af62748e29429492cafb1ed23`, quatro camadas operacionais:

| Camada | Registos | Campos | Papel |
|---|---|---|---|
| `RESIDENCIAS_EM_RISCO` | 4.850 (4.823 no painel) | 77 | **Dados principais** (`CAMADA_DADOS`) — Boavista, Edipesca e Molhada Q.7 |
| `Residencias_em_Risco_Sambizanga` | 2.338 (1.873 no painel) | 27 | Segundo levantamento, estrutura própria |
| `Boavista` | 1 | 5 | Contorno da área |
| `Porto_Seco_Mulemba` | 1 | 5 | Contorno, **oculto por omissão** |

São **dois levantamentos independentes**, mas **já não são disjuntos**: Edipesca e Molhada Q.7 foram copiados para a camada de Boavista e existem nas duas, com os mesmos registos. Quem os lê é a de Boavista — ver [Filtro de base](#filtro-de-base).

A camada de Sambizanga tem agora `Validacao` e `GGPEN_Controlo`, e o `AOI` continua por preencher.

> Contagens verificadas em agosto de 2026. **Mudam ao longo do dia** — o levantamento está a ser editado. Não tome nenhum número deste ficheiro como valor a citar: consulte o serviço.

### Campos usados

| Campo | Tipo | Notas |
|---|---|---|
| `AOI` | texto | `Boavista`, `Porto Seco da Mulemba`, e `" "` (espaço) |
| `Bairro` | texto livre | 3 valores em Boavista, 8 em Sambizanga |
| `Tipologia` | texto livre, 254 | **multi-valor**, sem domínio — ver abaixo |
| `T_Constru` | texto | Alvenaria, Bloco, Madeira, Chapa, Outros |
| `Afetacao` | texto | **com domínio** de 12 valores |
| `Num_Edif` | inteiro | unidades autónomas no polígono |
| `Area_m2` | número em Boavista, **texto** em Sambizanga | |
| `Estado` | inteiro | `0` Não Inscrito · `1` Pendente · `2` Inscrito |
| `Validacao` | inteiro | `0` Outros · `1` Primária · `2` Secundária — só em Boavista |
| `GGPEN_Cont` / `GGPEN_Controlo` | inteiro | controlo, sem domínio — ver [Modo Controlo](#modo-controlo) |

**O campo `Tipologia` merece atenção.** É texto livre sem domínio, com uma entrada por habitação, e o preenchimento real é irregular: 115 combinações distintas em Boavista, 88 em Sambizanga (estas todas com um espaço à frente). Aparecem quatro separadores (`,` `-` `/` e quebra de linha), multiplicadores (`2T3` = duas unidades T3), tipologias coladas (`T0T2`), `TO` com letra O, vírgulas a mais (`T,2`), vírgulas finais e texto que não é tipologia (`Sem t`, `Tt`, `000000`). Quem lê este campo tem de passar pelo `tipologiasDe()` de `src/lib/estatisticas.ts`, que trata de tudo isto — **nunca por um `split(",")`**.

### O nome do campo de controlo não é fixo

`GGPEN_Controlo` em Sambizanga, `GGPEN_Cont` em Boavista: republicar a partir de shapefile trunca os nomes a 10 caracteres. O `campoControloDe()` procura pelos nomes de `CAMPOS_CONTROLO` e devolve o que existir. **Nunca fixe o nome no código.**

### Camada do módulo de Luanda

Webmap `6b9f7d26963d439aa499c1fc66fa55de`, camada `Luanda_Nova_gdb`: **2.066.350 registos** e 42 campos, dos quais 11.829 nos 11 bairros do levantamento. Tem `minScale: 26667` — afastando o zoom, o ArcGIS deixa de a desenhar, e o módulo mostra um aviso em vez de um mapa aparentemente vazio.

### Consultar os dados diretamente

Os serviços são públicos. Acrescentar `?f=pjson` a qualquer URL devolve a definição:

```
.../FeatureServer/0?f=pjson                                   campos, domínios, capacidades
.../FeatureServer/0/query?where=1=1&returnCountOnly=true&f=pjson
.../FeatureServer/0/query?where=1=1&outFields=Tipologia&returnDistinctValues=true&f=pjson
arcgis.com/sharing/rest/content/items/{ID}/data?f=pjson       composição do webmap
```

---

## Módulo 1 — Painel do mapa

`Dashboard.tsx`. É o ecrã que se abre depois do login.

O `<main>` é um flex row: aba lateral (largura animada de 0 a `LARGURA_ABA`), puxador, e o mapa em `flex-1`. A aba **não flutua** sobre o mapa — encolhe-o, e o `MapView` reajusta-se sozinho. O único elemento por cima do mapa é a legenda, no canto inferior direito, e é intencional: é a legenda do que está desenhado.

A aba está organizada em quatro secções: **Módulos**, **Filtros**, **Apresentação** e **Edição**.

### Áreas

**A ÁREA não é um filtro como os outros** — pode trocar a camada em uso. As áreas não vivem todas no mesmo sítio: `Boavista` é um valor do campo `AOI` dentro de `CAMADA_DADOS`; `Sambizanga` é uma camada à parte. O mapeamento vive em `AREAS`.

| Área | Camada | Contagens |
|---|---|---|
| Todas | as duas | somadas (6.696) |
| Boavista | principal | 4.823 — inclui Edipesca e Molhada Q.7 |
| Sambizanga e novas áreas | Sambizanga | 1.873 — sem esses dois |

Mudar de área **limpa os restantes filtros** — os bairros de uma não existem na outra.

### Filtro de base

`CamadaConfig.filtroBase` é uma condição SQL aplicada **antes** de qualquer filtro do utilizador e que a interface não consegue remover. É ele que delimita cada área — não há filtro de área à parte.

| Camada | `filtroBase` | Polígonos |
|---|---|---|
| Boavista | `(AOI = 'Boavista' OR Bairro IN ('Edipesca', 'Molhada Q.7'))` | 4.823 |
| Sambizanga | `Bairro NOT IN ('Edipesca', 'Molhada Q.7')` | 1.873 |

**Edipesca e Molhada Q.7 existem nas duas camadas, com os mesmos registos.** São lidos pela de Boavista, e a de Sambizanga larga-os — de outra forma seriam contados a dobrar sempre que as duas camadas estão ativas. As duas regras vivem uma ao lado da outra em `arcgis.ts`, de propósito: mexer numa sem a outra volta a duplicar ou faz desaparecer os bairros.

Ficam de fora do painel o Porto Seco da Mulemba (bairro `Mulembeira`, 22 polígonos), os registos sem bairro e um `Pedreira S1` perdido na camada de Boavista.

> Atenção ao criar polígonos: um edifício gravado sem `AOI = 'Boavista'` fica invisível no painel, porque o `definitionExpression` o exclui.

### Filtros

Quatro — Bairro, Tipologia, Tipo de construção, Afetação — **em cascata**: `construirWhere(selecoes, campo)` ignora um campo ao listar as suas próprias opções, para que não se auto-filtre. Com as duas camadas ativas, as opções são a **união** dos valores de ambas, e cada camada aplica o **seu** `filtroBase` (daí o helper `whereDe(config)` em vez de um `where` único).

O mesmo `where` alimenta três coisas: o `definitionExpression` da camada, as contagens do cartão e as da aba lateral. Valores vão para SQL — passar sempre por `escaparSql`, e juntar condições com `comCondicao` para não deixar `1=1` pendurado.

**Etiqueta de confirmação nos bairros.** Cada bairro da lista mostra **Confirmado** ou **Não confirmado**: confirmado só quando *todos* os polígonos do bairro têm o campo de controlo a 1. Basta um a zero, a dois ou por preencher para o bairro deixar de o estar. Pergunta-se pelo contrário — que bairros *têm* algo por verificar — porque isso é uma consulta de valores distintos por camada, e não uma por bairro. O rótulo é calculado sobre o bairro inteiro e **ignora os outros filtros de propósito**: se dependesse da seleção, escolher um bairro alterava o rótulo desse mesmo bairro.

### Simbologia

As cores de `ESTADOS` e `VALIDACOES` são **cópias dos renderers do webmap**, não escolhas de design — mexer nelas desalinha a legenda do que está desenhado.

Cada camada é desenhada por um campo diferente: `CAMADA_DADOS` usa um renderer por `Validacao`, a de Sambizanga um por `Estado`.

O seletor **Colorir mapa por** tem três modos:

| Modo | Efeito |
|---|---|
| **Webmap** (omissão) | Mantém o renderer do ArcGIS Online. Alterações no portal aparecem sem tocar no código |
| **Estado** | `UniqueValueRenderer` construído por `lib/simbologia.ts` a partir de `ESTADOS` |
| **Controlo** | Só admin — ver abaixo |

Os renderers originais são guardados em `renderersOriginaisRef` na primeira vez que cada camada é vista, e repostos ao voltar a "Webmap". Por isso o `MapaArcGIS` faz `load()` em **todas** as camadas configuradas: sem estarem carregadas, `layer.renderer` ainda não existe.

**A legenda lê cores e rótulos do renderer em uso**, via `lerLegenda()`. Se alguém mudar a simbologia no ArcGIS Online, o cartão acompanha sozinho. O que continua a vir do código é a **lista de valores contados** — um valor novo no domínio não é contado até ser acrescentado a `ESTADOS`.

### Modo Controlo

Só para admin, e só com uma área escolhida. Grava no campo de controlo, um inteiro editável **sem domínio definido no portal** — os códigos são convenção nossa, em `arcgis.ts`:

| Valor | Estado |
|---|---|
| `1` | Validado |
| `2` | Não validado |
| `0` ou `null` | Por verificar |

São **três estados**. "Por verificar" é o de partida e também o de quem viu o polígono e o deixou para uma segunda passagem — por isso apanha o zero e o nulo, tanto no renderer como na contagem (`condicaoControlo`).

Ao selecionar um polígono, o painel mostra o **diagnóstico automático** de `lib/conformidade.ts`, que reproduz em TypeScript a expressão Arcade do webmap (Regularizado, erros de NIF, tipologia, casas…). Serve para quem valida decidir com o mesmo critério que o mapa usa para desenhar.

> **Se a expressão Arcade for alterada no ArcGIS Online, `conformidade.ts` tem de acompanhar.** São duas cópias da mesma regra, e não há forma de as manter sincronizadas automaticamente.

> **Se o portal vier a atribuir um domínio a este campo, os códigos têm de coincidir.**

### Edição

`ModuloEdicao.tsx`. Usa o widget `Editor` sobre a camada ativa. Só admin, e só com uma área escolhida.

`addEnabled: false` e `deleteEnabled: false` — só se **alteram** feições existentes. São registos de um levantamento oficial, e a interface não teria como desfazer um apagar nem um polígono desenhado por engano.

### O que é escrito no ArcGIS

**O Modo Controlo e o Módulo de Edição escrevem** — são as duas únicas partes da aplicação que o fazem, ambas por `applyEdits`. Tudo o resto (filtros, visibilidade, renderers) muda **só na memória do browser**: recarregar a página repõe tudo, e quem abrir o webmap no portal vê-o intacto.

A aplicação **não está autenticada no portal**, portanto as edições vão como **anónimas**. Funciona porque o serviço tem `Create,Update,Delete` nas capacidades e `allowAnonymousToUpdate: true` — o que também significa que qualquer pessoa na internet o consegue fazer, com ou sem esta aplicação.

### O que reflete automaticamente

| Reflete sozinho | Precisa de alteração no código |
|---|---|
| Registos novos e editados | Camadas novas (são desenhadas, mas não entram em filtros nem contagens) |
| Valores novos nos filtros | Campos novos para filtrar |
| Cores e rótulos da legenda, no modo Webmap | Valores novos nos domínios |
| Mapa de fundo e enquadramento inicial | Rótulos e cores de `ESTADOS`/`VALIDACOES` |

---

## Módulo 2 — Cadastro de Luanda

`PainelLuanda.tsx` e `MapaLuanda.tsx`, configurados em `src/lib/luanda.ts`. **Só admin.**

Webmap e camada próprios, deliberadamente **sem reutilizar** o `MapaArcGIS`: são levantamentos diferentes, e partilhar o wrapper faria com que uma alteração num módulo mexesse no outro.

A camada tem mais de dois milhões de registos, por isso o `filtroBase` restringe-a aos **11 bairros do levantamento**, por lista explícita:

```ts
export const BAIRROS_LUANDA = ["Boa Vista Q. 11", "Caranguejo Q. 2", "Edipesca", "Kimbaria Q 3",
  "Landilson Q. 1", "Madeira S3", "Molhada Q.7", "Morro dos Bois S5", "Pedreira S1",
  "Roque Santeiro S4", "Seriango Q. 10"];
```

Filtrar por município **não** serve: traz 21 bairros a mais e deixa 5 de fora, porque alguns pertencem à Ingombota e não a Sambizanga. A lista explícita é o preço a pagar — um bairro novo na camada não aparece até ser acrescentado aqui.

Filtros próprios: Município, Comuna, Bairro, Afetação. O campo `Inscricao` tem 7 valores, com as cores do webmap em `INSCRICOES`.

---

## Módulo 3 — Indicadores do levantamento

`PainelEstatisticas.tsx`, cálculo em `src/lib/estatisticas.ts`. Reproduz os indicadores do relatório oficial, **calculados a partir das camadas em tempo real**. Disponível a admin e a utilizador normal.

### Como lê os dados

Não usa mapa: cria uma `FeatureLayer` avulsa por URL e consulta. Depender de um `MapView` obrigaria a ter o mapa visível para o contentor ganhar tamanho — foi exatamente isso que uma vez deixou a página presa em "A calcular indicadores…".

O seletor no topo tem três opções:

| Opção | Fontes |
|---|---|
| **Todas** (omissão) | Boavista + Novas Áreas, somadas |
| **Boavista** | `CAMADA_DADOS`, com o seu `filtroBase` |
| **Novas Áreas** | camada de Sambizanga, restrita a `BAIRROS_NOVAS_AREAS` |

A soma **não é feita somando indicadores**: os registos das duas camadas são juntos num só conjunto e contados de uma vez. É o que evita somar percentagens ou bases, e faz com que a tabela por bairro e as distribuições se juntem sem trabalho extra.

> **"Novas Áreas" é um âmbito deste módulo, não da camada.** O `FILTRO_NOVAS_AREAS` vive fora de `CAMADA_SAMBIZANGA` de propósito: no painel do mapa, a camada continua a chamar-se Sambizanga e a mostrar os oito bairros. Promovê-lo a `filtroBase` mudaria o mapa também — já aconteceu uma vez.

### As regras de contagem

| Indicador | Regra |
|---|---|
| Polígonos | um por registo |
| Imóveis | `Num_Edif` quando > 0, senão 1 |
| Habitações | imóveis cuja `Afetacao` é `Habitação` |
| Tipologias | uma entrada por habitação, **limitada ao `Num_Edif`** |
| Área | soma de `Area_m2` |

Na tipologia, `T1,T1,T2` soma duas ao T1 e uma ao T2, e `2T3` soma duas ao T3. A contagem de cada polígono nunca excede o `Num_Edif` que ele declara, e o que faltar entra em "Não indicado" — assim a base fecha sempre com o número de habitações, como no relatório. Os polígonos que listam mais tipologias do que declaram ficam contados em `poligonosTipologiaAcimaDoDeclarado`.

As barras mostram T0 a T4 e agrupam o resto em "T5 e superiores / s. inf.", como o relatório.

### Gráficos

Sem biblioteca: `ui/ColunasAgrupadas.tsx` (SVG) e `ui/BarrasHorizontais.tsx` (HTML), com os parâmetros em `lib/graficos.ts`.

As duas cores — `#2a78d6` e `#eb6834` — não são escolha de gosto: são as duas primeiras da paleta categórica de referência, validadas para protanopia e deuteranopia contra superfície clara. Trocá-las por cores da paleta do site parte a separação.

O gráfico de colunas desenha-se à **largura medida do contentor**, com `ResizeObserver`, e não com um `viewBox` elástico: com escala, uma coluna de 24px sai com 43 e o texto do eixo cresce na mesma proporção, ficando maior do que o resto da página.

### Exportar em PDF

O botão **Exportar PDF** chama `window.print()`; o resultado sai da folha de impressão em `src/index.css`. Não há biblioteca de PDF, e não faz falta: assim os gráficos vão para o ficheiro **em vetor**. Uma biblioteca teria de os redesenhar ou fotografá-los, e ficaria pior.

A folha de impressão trata de quatro coisas, e todas são necessárias:

| Regra | Porquê |
|---|---|
| `print-color-adjust: exact` | Sem isto o Chrome imprime a barra azul a branco e as barras desaparecem |
| `.sem-impressao { display: none }` | Botões e seletores não têm utilidade em papel |
| `.cabecalho-painel { position: static }` | Um cabeçalho `sticky` comporta-se mal impresso |
| `.grelha-impressao` a três colunas | A largura de um A4 nunca chega ao ponto de rutura `xl` do Tailwind |

O título do documento é trocado antes de imprimir, para o browser sugerir `indicadores-boavista-2026-08-25` como nome. E a data da leitura aparece **só no papel**: sem ela o PDF não se pode citar, porque a camada muda ao longo do dia.

---

## Autenticação

Real, contra Postgres. **Não há registo aberto**: a primeira conta nasce por linha de comando, as seguintes são criadas por um administrador dentro da aplicação.

| Ficheiro | Papel |
|---|---|
| `db/schema.sql` | Tabelas `utilizadores`, `sessoes` e `verificacoes`. Idempotente |
| `server/db.js` | Pool do `pg`; TLS decidido pelo destino |
| `server/auth.js` | scrypt, criação e validação de sessões, opções do cookie |
| `server/rotas.js` | Endpoints e a trava de tentativas |
| `src/lib/api.ts` | Cliente do frontend; todos os pedidos com `credentials: "include"` |

### Papéis

`utilizadores.papel` é `admin` ou `utilizador`.

| | Admin | Utilizador |
|---|---|---|
| Painel do mapa e filtros | sim | sim |
| Indicadores do levantamento | sim | sim |
| Cadastro de Luanda | sim | **não** |
| Colorir mapa por | Webmap · Estado · Controlo | fixo em Estado |
| Edição | sim | não |
| Funcionários e acessos | sim | não |

O botão de gestão aparece conforme o papel, mas isso é **conveniência, não segurança** — quem decide é o `exigirAdmin` no servidor, que lê o papel da base de dados a cada pedido. Já o Cadastro de Luanda e a Edição são gates **só do browser**: não passam pela nossa API, e as camadas do ArcGIS são públicas.

Um admin não se pode desativar nem despromover a si próprio; sem isso seria possível ficar sem nenhum administrador.

### Endpoints

| Método | Rota | Quem |
|---|---|---|
| `POST` | `/api/sessao` | público |
| `GET` | `/api/sessao` | autenticado |
| `DELETE` | `/api/sessao` | autenticado |
| `PATCH` | `/api/eu/palavra-passe` | autenticado |
| `GET` | `/api/controlo/:camadaId` | admin |
| `PUT` | `/api/controlo/:camadaId/:globalId` | admin |
| `GET` | `/api/utilizadores` | admin |
| `POST` | `/api/utilizadores` | admin |
| `PATCH` | `/api/utilizadores/:id` | admin |

### Decisões de segurança

Estas não se devem inverter sem pensar:

- **Sessão em cookie `httpOnly`**, não JWT em `localStorage` — um XSS não consegue roubar o token.
- **Na base de dados guarda-se o SHA-256 do token**, não o token — uma leitura indevida da tabela não dá acesso a nada.
- **`crypto.scrypt`** da biblioteca padrão, em vez de bcrypt — evita dependência nativa no build do Render.
- **Mensagem de erro igual** para email inexistente e palavra-passe errada — não permite descobrir que emails existem.
- **Alterar a própria palavra-passe exige a atual**, mesmo com sessão válida — um cookie roubado não deve permitir tomar a conta. Fecha as outras sessões e mantém a de quem está a alterar.
- **Alterar senha, papel ou desativar apaga as sessões** dessa conta.
- **Um admin não se pode desativar nem despromover a si próprio.**
- **A API é montada antes dos ficheiros estáticos** — ao contrário, o fallback da SPA responderia `index.html` a `/api` inexistentes.

---

## Deploy

**Render**, Web Service em Node, descrito em `render.yaml`.

| | |
|---|---|
| Build | `npm ci --include=dev && npx tsc --noEmit && npm run build && npm run db:migrar && npm run db:semear` |
| Start | `node server.js` |
| Health check | `/healthz` |

O `--include=dev` é obrigatório: o Render define `NODE_ENV=production` e, sem a flag, o npm salta as devDependencies e fica sem `vite` nem `typescript`.

`server.js` serve `dist/` com cache imutável em `/assets`, fallback da SPA para `index.html`, e três cabeçalhos de segurança. Escuta em `process.env.PORT` — **nunca fixar a porta**.

O site é servido na **raiz** do domínio, por isso `BASE_PATH` não é definido e o `base` do Vite fica `/`. O suporte a subcaminho continua no `vite.config.ts` caso volte a ser preciso. **Nunca escrever caminhos absolutos para ficheiros de `public/`** — usar `asset("logo.png")`, que prefixa com `import.meta.env.BASE_URL`.

A migração e a semeadura são idempotentes: correm em cada deploy sem estragar nada.

> Se o serviço tiver sido criado à mão no painel, o `render.yaml` é **ignorado**. Os comandos e as variáveis que valem são os do painel.

---

## Convenções de código

- **Named exports**, nunca `export default`. Ficheiro em `PascalCase.tsx` com o mesmo nome do componente.
- Props tipadas com `interface XProps`, estendendo o tipo HTML nativo quando aplicável.
- Imports relativos (`../lib/utils`) — não há alias `@/`.
- **Não importar `React` só por importar.** O `jsx: react-jsx` dispensa-o, e o `noUnusedLocals` transforma isso em erro de compilação.
- Componentes que envolvem `motion.*` estendem `HTMLMotionProps<"tag">`, nunca os atributos nativos do React — o framer-motion redefine `onDrag` e `onAnimationStart` de forma incompatível.
- Cada secção da landing é uma `<section>` com `container mx-auto px-4 md:px-6` e `py-20`.
- Mobile-first: base sem prefixo, depois `md:` / `sm:`.
- Texto visível ao utilizador em **português**.

### Paleta

Cores fora do tema Tailwind, em hex arbitrário:

| Cor | Uso |
|---|---|
| `#c43d3d` | vermelho — botão primary |
| `#754040` | hover do primary |
| `#c4b03d` | dourado — botão secondary |
| `#4d221a` | castanho escuro — fundo do CTA final |
| `#c4703d` | terracota — `selection:` |
| `#1a4d2e` | verde — outline, ghost, focus ring |
| `#0b1c38` | azul-escuro — barras dos painéis |

Neutros: escala `stone` do Tailwind. **As cores dos gráficos e da legenda do mapa não pertencem a esta paleta** e não devem ser alinhadas com ela — ver [Gráficos](#gráficos) e [Simbologia](#simbologia).

---

## Tarefas comuns

### Acrescentar uma área nova

Em `src/lib/arcgis.ts`:

```ts
export const CAMADA_NOVA: CamadaConfig = {
    id: "edificios-nova-area",
    titulo: "Edifícios — Nova Área",
    url: `${BASE}/Nome_Do_Servico/FeatureServer/0`,
    campoSimbologia: CAMPO_ESTADO,
};
```

Acrescentar a `CAMADAS`, a `CAMADAS_EDIFICIOS` e a `AREAS`. Se a camada não estiver no webmap, o `MapaArcGIS` acrescenta-a (compara pelo URL normalizado com `urlCompletaDaCamada`, porque o SDK guarda o índice separado em `layerId`).

### Acrescentar um valor a um domínio

Se surgir `Estado = 3`, acrescentar a `ESTADOS`. Sem isso, esses edifícios são desenhados mas **não contados**.

### Repor a palavra-passe de alguém

Pelo painel de gestão, ou:

```bash
npm run db:utilizador -- email@dominio.ao "NovaSenha123" "Nome" admin
```

### Alterar cores da legenda

**Não altere `ESTADOS`/`VALIDACOES` para mudar o aspeto do mapa.** Essas cores são cópias do webmap e servem de reserva. Para mudar o que se vê, altere a simbologia no ArcGIS Online — a legenda acompanha.

### Atualizar o `@arcgis/core`

Atualizar também `ARCGIS_VERSION` em `arcgis.ts`. Os assets do SDK (ícones, fontes) vêm do CDN via `esriConfig.assetsPath`, e as duas versões têm de coincidir.

---

## Limitações conhecidas

### Qualidade dos dados

- **`Num_Edif` está vazio ou a zero em 94% dos polígonos de Boavista** (4.113 de 4.358). Onde não há número, assume-se 1 imóvel. Só 245 polígonos declaram mesmo um valor.
- **`Area_m2` está por preencher em parte de Sambizanga** — nomeadamente em Edipesca e Molhada Q.7, os dois bairros das "Novas Áreas". Os cartões de área desse âmbito mostram zero, e é verdade. Em Sambizanga o campo é ainda de **texto**, não numérico: funciona porque o decimal é ponto, mas se lá aparecer vírgula a área passa a zero sem avisar.
- **`Tipologia` é texto livre e está irregular** — ver [Os dados](#os-dados). O `tipologiasDe()` recupera tudo menos oito valores ilegíveis.
- Em Sambizanga, vários campos têm **um espaço à frente do valor** (`" T0,T0"`). Comparações em SQL falham; as do lado do cliente usam `trim()`.
- `Validacao` está preenchido numa pequena minoria dos edifícios de Boavista, e os nulos são desenhados com a mesma cor de "Outros" — não se distingue "classificado como Outros" de "por classificar".
- O significado institucional de "Primária" e "Secundária" não está documentado no serviço.

### Números que não batem com o relatório

O painel lê a camada **ao vivo**; o relatório é uma fotografia. Enquanto houver levantamento a decorrer, os dois divergem em alguns registos — e os quarteirões que divergem são precisamente os que estão a ser trabalhados. Não é erro de cálculo: a metodologia foi verificada contra o relatório num quarteirão já fechado, onde bate ao número em todas as colunas.

O painel também **não se atualiza sozinho enquanto está aberto**: lê a camada ao entrar e ao trocar de área. Não há temporizador nem sondagem.

### Segurança

- Os serviços ArcGIS são **públicos** e aceitam escrita anónima (`allowAnonymousToUpdate: true`). A camada principal tem `NIF_Prop` e `ID_AGT`. Convém confirmar se o serviço deve mesmo estar aberto antes de o levantamento avançar.
- A trava de tentativas de login é **em memória**: reinicia com o processo e não é partilhada entre instâncias. Se o serviço escalar, precisa de Redis ou de uma tabela.
- Não há recuperação de palavra-passe por email. A reposição é feita por um administrador.
- O administrador escreve a palavra-passe do novo utilizador e vê-a em claro; deve comunicá-la por canal seguro.

### Interface

- `src/index.css` importa Inter e Playfair Display, mas `tailwind.config.js` não as declara em `theme.extend.fontFamily` — as fontes são descarregadas e **não são aplicadas**. Para corrigir:

  ```js
  theme: { extend: { fontFamily: {
    sans: ['Inter', 'sans-serif'],
    serif: ['"Playfair Display"', 'serif'],
  } } }
  ```

- `index.html` ainda tem `lang="en"` e o favicon do Vite.
- Não há modo escuro. Os gráficos assumem superfície clara, e a paleta foi validada só para esse caso.

### Código morto

- `src/lib/exportar.ts` ficou por remover quando a exportação passou de CSV para PDF. Não é importado por ninguém e não entra no build. Remover com `git rm src/lib/exportar.ts`.
