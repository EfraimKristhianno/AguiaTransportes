

# Plano para Corrigir Erros de Registro e Configuração do Banco

## Problema Identificado

O erro "Erro ao criar conta" ocorre porque:
1. O email `admin@gmail.com` **já está cadastrado** no Supabase Auth
2. O sistema não está exibindo a mensagem correta para este caso
3. As tabelas do banco de dados podem não estar criadas ainda

## Solução

### Parte 1: Correção da Mensagem de Erro

Melhorar o tratamento de erros no `RegisterForm.tsx` para exibir mensagens mais claras quando o usuário já existe.

**Arquivo**: `src/components/RegisterForm.tsx`
- Atualizar a função `getErrorMessage` para fazer match exato com o código de erro
- Mostrar "Este email já está cadastrado" quando receber `user_already_exists`

### Parte 2: Script SQL para Criar Tabela user_roles

Você precisa executar o seguinte SQL no Supabase SQL Editor para criar a tabela de roles:

```sql
-- 1. Criar o enum de roles
CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'motorista', 'cliente');

-- 2. Criar tabela de roles (usando auth.users diretamente)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'cliente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id)
);

-- 3. Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Função para verificar se é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
$$;

-- 5. Política: usuários autenticados podem ver seu próprio role
CREATE POLICY "Users can view own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 6. Política: permitir insert quando não há nenhum admin (primeiro usuário)
CREATE POLICY "First user becomes admin"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
  OR public.is_admin()
);

-- 7. Política: admins podem gerenciar roles
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
```

### Parte 3: Opções para o Usuário Existente

Como o email `admin@gmail.com` já está cadastrado, você tem duas opções:

**Opção A** - Fazer login com a senha existente
- Tente fazer login com `admin@gmail.com` e a senha que você usou anteriormente

**Opção B** - Deletar o usuário e recomeçar
- No Supabase Dashboard > Authentication > Users
- Delete o usuário `admin@gmail.com`
- Execute o SQL acima para criar a tabela `user_roles`
- Registre novamente - o primeiro usuário será automaticamente admin

---

## Detalhes Técnicos

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/RegisterForm.tsx` | Corrigir match de código de erro `user_already_exists` |

### Fluxo de Autenticação Corrigido

```text
Registro → Supabase Auth cria usuário
         → AuthContext detecta login
         → Verifica se user_roles tem registros
         → Se vazio, insere user com role 'admin'
         → Se não vazio, role padrão é 'cliente'
```

