# TECH-GEST: GPL

Plataforma de visualização e gestão de residências em risco no Governo Provincial de Luanda. Desenvolvida pelo **GGPEN / GEDAE**.

O site tem duas partes: uma **página de apresentação** pública e um **painel de análise** com mapa, acessível só a utilizadores autenticados.

---

## Índice

- [Arranque rápido](#arranque-rápido)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Os dados](#os-dados)
- [Como o painel funciona](#como-o-painel-funciona)
- [Autenticação](#autenticação)
- [Deploy](#deploy)
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
docker compose up -d          # Postgres na porta 5433
```

**Ou apontar a `DATABASE_URL` a um Supabase existente.**

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

> **`npm run build` não verifica tipos.** O Vite transpila sem conferir. Corra sempre `npx tsc --noEmit` antes de fazer push — é o que o Render executa e o que faz falhar o deploy.

---

## Variáveis de ambiente

| Variável | Obrigatória | Para quê |
|---|---|---|
| `DATABASE_URL` | sim | Ligação ao Postgres |
| `NODE_ENV` | em produção | Decide o TLS do cookie de sessão |
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
public/                 imagens estáticas
db/schema.sql           tabelas de autenticação
scripts/                migração, semeadura, criação de contas
server.js               Express: API + ficheiros estáticos
server/
  db.js                 pool do Postgres
  auth.js               scrypt, sessões, cookie
  rotas.js              endpoints /api
src/
  App.tsx               navegação entre landing, login e painel
  lib/
    arcgis.ts           camadas, campos, domínios, cores, SQL
    simbologia.ts       renderers e leitura da legenda
    api.ts              cliente da API
    utils.ts            cn() e asset()
  components/
    Navbar Hero Mission HowItWorks Impact Community Footer
    Login.tsx           portal de acesso
    Dashboard.tsx       mapa, filtros e indicadores
    MapaArcGIS.tsx      wrapper do MapView
    MenuConta.tsx       menu da conta
    Utilizadores.tsx    gestão de acessos (admin)
    AlterarPalavraPasse.tsx
    ui/Button.tsx
```

Não há `react-router`. `App.tsx` alterna entre três vistas com `useState`; o URL nunca muda.

---

## Os dados

Vivem no **ArcGIS Online**, não neste projeto. O webmap `56676e3af62748e29429492cafb1ed23` define quais camadas se desenham, por que ordem e com que cores; os polígonos vêm dos serviços em `services-eu1.arcgis.com`.

### Camadas

| Camada | Registos | Papel |
|---|---|---|
| `RESIDENCIAS_EM_RISCO` | 4299 em Boavista | **Dados principais**, 64 campos |
| `Residencias_em_Risco_Sambizanga` | 1517 | Segundo levantamento, 24 campos |
| `Boavista` | 1 | Contorno da área |
| `Porto_Seco_Mulemba` | 1 | Contorno, **oculto** |

São **dois levantamentos independentes**, com estruturas diferentes. Sambizanga não tem o campo `Validacao`, e tem `AOI`, `Tipologia`, `T_Constru` e `Afetacao` por preencher.

### Campos usados

| Campo | Tipo | Valores |
|---|---|---|
| `AOI` | texto | `Boavista`, `Porto Seco da Mulemba` |
| `Bairro` | texto | livre |
| `Tipologia` | texto | T0, T1, T2, T3, T4, Outros |
| `T_Constru` | texto | Alvenaria, Madeira, Chapa, Outros |
| `Afetacao` | texto | Habitação, Comércio, Escritório, Indústria, Roulote, Contentor, Objecto não habitável, Outros |
| `Estado` | inteiro | 0 Não Inscrito, 1 Pendente, 2 Inscrito |
| `Validacao` | inteiro | 0 Outros, 1 Primária, 2 Secundária |

### Filtro de base

A camada principal tem `AOI = 'Boavista'` fixo em `CAMADA_DADOS.filtroBase`. **Porto Seco da Mulemba e os registos com `AOI` em branco não são desenhados nem contados**, e a interface não tem como os trazer de volta.

### Consultar os dados diretamente

Os serviços são públicos. Acrescentar `?f=pjson` a qualquer URL devolve a definição:

```
.../FeatureServer/0?f=pjson                          campos e domínios
.../FeatureServer/0/query?where=1=1&returnCountOnly=true&f=pjson
arcgis.com/sharing/rest/content/items/{ID}/data?f=pjson    composição do webmap
```

---

## Como o painel funciona

### Áreas

A ÁREA não é um filtro como os outros: pode **trocar a camada em uso**.

| Área | Camada | Contagens |
|---|---|---|
| Todas | as duas | somadas |
| Boavista | principal | só dela |
| Sambizanga e novas áreas | Sambizanga | só dela |

Mudar de área limpa os restantes filtros — os bairros de uma não existem na outra.

### Filtros

Quatro, **em cascata**: escolher um bairro restringe as tipologias disponíveis a esse bairro. Com as duas camadas ativas, as opções são a união dos valores de ambas.

### Indicadores

O cartão mostra sempre o campo por que o mapa está pintado:

| Situação | Cartão | Aba lateral |
|---|---|---|
| Boavista, modo Webmap ou Validação | Validação | Estado |
| Modo Estado | Estado | — |
| Sambizanga | Estado | — |
| Todas | Estado, somado | Validação, só de Boavista |

Com as duas camadas somadas o cartão passa a `Estado` porque é o **único campo comum às duas**.

### Simbologia

Seletor **Colorir mapa por**, com três modos:

| Modo | Cores |
|---|---|
| **Webmap** (omissão) | as definidas no ArcGIS Online |
| **Estado** | construídas a partir de `ESTADOS` |
| **Validação** | a partir de `VALIDACOES`; indisponível com Sambizanga |

**Cores e rótulos da legenda são lidos do renderer em uso**, nunca assumidos. Se a simbologia mudar no portal, o cartão acompanha.

### O que reflete automaticamente

| Reflete sozinho | Precisa de alteração no código |
|---|---|
| Registos novos e editados | Camadas novas |
| Valores novos nos filtros | Campos novos para filtrar |
| Cores e rótulos da legenda | Valores novos nos domínios |
| Mapa de fundo e enquadramento | |

### Nada é escrito no ArcGIS

Filtros, visibilidade e renderers são alterados **só na memória do browser**. A aplicação nunca se autentica no portal nem chama `save()`. Recarregar a página repõe tudo, e quem abrir o webmap no ArcGIS Online vê-o intacto.

---

## Autenticação

Real, contra Postgres. **Não há registo aberto**: a primeira conta nasce por linha de comando, as seguintes são criadas por um administrador dentro da aplicação.

### Papéis

| Papel | Pode |
|---|---|
| `utilizador` | Ver o painel, alterar a sua palavra-passe |
| `admin` | O mesmo, mais criar, editar, promover e desativar contas |

### Endpoints

| Método | Rota | Quem |
|---|---|---|
| `POST` | `/api/sessao` | público |
| `GET` | `/api/sessao` | autenticado |
| `DELETE` | `/api/sessao` | autenticado |
| `PATCH` | `/api/eu/palavra-passe` | autenticado |
| `GET` | `/api/utilizadores` | admin |
| `POST` | `/api/utilizadores` | admin |
| `PATCH` | `/api/utilizadores/:id` | admin |

### Decisões de segurança

Estas não se devem inverter sem pensar:

- **Sessão em cookie `httpOnly`**, não JWT em `localStorage` — um XSS não consegue roubar o token.
- **Na base de dados guarda-se o SHA-256 do token**, não o token — uma leitura indevida da tabela não dá acesso a nada.
- **`crypto.scrypt`** da biblioteca padrão, em vez de bcrypt — evita dependência nativa no build.
- **Mensagem de erro igual** para email inexistente e palavra-passe errada — não permite descobrir que emails existem.
- **Alterar a própria palavra-passe exige a atual**, mesmo com sessão válida — um cookie roubado não deve permitir tomar a conta.
- **Alterar senha, papel ou desativar apaga as sessões** dessa conta.
- **Um admin não se pode desativar nem despromover a si próprio** — evita ficar sem administradores.
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

A migração e a semeadura são idempotentes: correm em cada deploy sem estragar nada.

> Se o serviço tiver sido criado à mão no painel, o `render.yaml` é **ignorado**. Os comandos e as variáveis que valem são os do painel.

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

Acrescentar a `CAMADAS`, a `CAMADAS_EDIFICIOS` e a `AREAS`. A camada tem de estar no webmap, ou é adicionada automaticamente.

### Acrescentar um valor a um domínio

Se surgir `Estado = 3`, acrescentar a `ESTADOS`. Sem isso, esses edifícios são desenhados mas **não contados**.

### Repor a palavra-passe de alguém

Pelo painel de gestão, ou:

```bash
npm run db:utilizador -- email@dominio.ao "NovaSenha123" "Nome" admin
```

### Alterar cores da legenda

**Não altere `ESTADOS`/`VALIDACOES` para mudar o aspeto do mapa.** Essas cores são cópias do webmap e servem de reserva. Para mudar o que se vê, altere a simbologia no ArcGIS Online — a legenda acompanha.

---

## Limitações conhecidas

**Dados**

- `Validacao` está preenchido em 18 de 4299 edifícios em Boavista. 335 não têm valor nenhum, e são desenhados com a mesma cor de "Outros" — não se distingue "classificado como Outros" de "por classificar".
- Sambizanga tem `Estado = 0` em todos os 1517 registos e quatro campos por preencher, portanto os seus filtros aparecem vazios.
- O significado institucional de "Primária" e "Secundária" não está documentado no serviço.

**Segurança**

- Os serviços ArcGIS são **públicos**. A camada principal tem `NIF_Prop` e `ID_AGT`; hoje só 3 registos têm NIF preenchido, mas convém confirmar se o serviço deve mesmo estar aberto antes de o levantamento avançar.
- A trava de tentativas de login é em memória: reinicia com o processo e não é partilhada entre instâncias. Se o serviço escalar, precisa de Redis ou de uma tabela.
- Não há recuperação de palavra-passe por email. A reposição é feita por um administrador.
- O administrador escreve a palavra-passe do novo utilizador e vê-a em claro; deve comunicá-la por canal seguro.

**Interface**

- `src/index.css` importa Inter e Playfair Display, mas `tailwind.config.js` não as declara em `theme.extend.fontFamily` — as fontes são descarregadas e **não são aplicadas**.
- `index.html` ainda tem `lang="en"` e o favicon do Vite.
- O bundle do `@arcgis/core` é grande e é carregado no arranque, mesmo para quem só vê a landing page.