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
