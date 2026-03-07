

## Diagnostico

O erro nos logs do OneSignal e claro: **"All included players are not subscribed"**. Isso significa que nenhum motorista se inscreveu para receber notificacoes push no OneSignal. A API esta funcionando corretamente, mas nao ha dispositivos registrados.

O problema raiz: o prompt slidedown do OneSignal pode nao aparecer no Chrome Android por diversas razoes (configuracoes do dashboard OneSignal sobrescrevendo as do SDK, service worker nao registrando, ou o usuario simplesmente nao vendo o prompt).

## Plano

### 1. Adicionar botao explicito de ativar notificacoes na tela do motorista

Em vez de depender apenas do prompt automatico (que pode falhar no mobile), adicionar um botao visivel na pagina `/motoristas` quando o usuario e motorista. Este botao chamara `OneSignal.Slidedown.promptPush()` diretamente.

**Arquivo**: `src/pages/Motoristas.tsx`
- Adicionar um banner/card no topo da view do motorista com botao "Ativar Notificacoes"
- O botao chama `OneSignal.Slidedown.promptPush()` ou `Notification.requestPermission()` seguido do OneSignal push
- Verificar o estado atual da permissao e esconder o botao se ja permitido

### 2. Melhorar inicializacao do OneSignal no index.html

**Arquivo**: `index.html`
- Adicionar `serviceWorkerPath: "/OneSignalSDKWorker.js"` na configuracao
- Adicionar `allowLocalhostAsSecureOrigin: true` para testes
- Remover a dependencia exclusiva do slidedown automatico

### 3. Garantir que o tagging acontece APOS a permissao ser concedida

**Arquivo**: `src/contexts/AuthContext.tsx`
- Na funcao `tagOneSignalUser`, apos o login e tags, chamar `OneSignal.Notifications.requestPermission()` para motoristas
- Isso garante que o prompt nativo do navegador apareca quando o motorista fizer login

### Detalhes tecnicos

- O `OneSignalDeferred.push()` no AuthContext pode nao executar se o SDK ja foi inicializado (ele so processa a fila uma vez). Mudar para acessar `window.OneSignal` diretamente quando disponivel.
- Adicionar verificacao `OneSignal.Notifications.permission` para mostrar/esconder o botao de ativar.
- No mobile Android, o prompt nativo (`Notification.requestPermission()`) e mais confiavel que o slidedown do OneSignal.

