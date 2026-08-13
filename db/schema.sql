-- Esquema da autenticação. Idempotente: pode correr as vezes que forem precisas.

create table if not exists utilizadores (
    id            uuid primary key default gen_random_uuid(),
    email         text        not null unique,
    nome          text        not null,
    -- Formato "salt:hash", ambos em hexadecimal. Ver server/auth.js.
    palavra_passe text        not null,
    ativo         boolean     not null default true,
    criado_em     timestamptz not null default now()
);

-- Acrescentado depois da primeira versão: por isso "add column if not exists",
-- para a migração funcionar tanto numa base nova como numa já existente.
alter table utilizadores add column if not exists papel text not null default 'utilizador';

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'utilizadores_papel_valido') then
        alter table utilizadores
            add constraint utilizadores_papel_valido check (papel in ('admin', 'utilizador'));
    end if;
end $$;

-- Guarda-se o SHA-256 do token, nunca o token em si: se a base de dados for
-- lida por terceiros, os cookies em circulação continuam inúteis.
create table if not exists sessoes (
    id            uuid primary key default gen_random_uuid(),
    token_hash    text        not null unique,
    utilizador_id uuid        not null references utilizadores(id) on delete cascade,
    expira_em     timestamptz not null,
    criado_em     timestamptz not null default now()
);

create index if not exists sessoes_utilizador_idx on sessoes (utilizador_id);
create index if not exists sessoes_expira_idx on sessoes (expira_em);

-- Controlo de verificação dos polígonos.
--
-- Vive aqui e não no ArcGIS porque a aplicação lê os serviços de forma anónima,
-- sem permissão de escrita. A chave é o GlobalId, que sobrevive a republicações
-- da camada; o objectid é guardado à parte por ser o que o mapa usa para
-- destacar feições, e pode mudar se a camada for republicada.
create table if not exists verificacoes (
    camada_id     text        not null,
    global_id     text        not null,
    objectid      integer     not null,
    verificado    boolean     not null default true,
    nota          text,
    utilizador_id uuid        references utilizadores(id) on delete set null,
    atualizado_em timestamptz not null default now(),
    primary key (camada_id, global_id)
);

create index if not exists verificacoes_camada_idx on verificacoes (camada_id) where verificado;
