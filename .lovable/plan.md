

## Plano: Notificação Push para Motoristas com Som (VAPID)

### Diagnóstico

A infraestrutura de notificação push ja existe no projeto (edge function `notify-driver`, hook `useWebPush`, service worker `sw-push.js`), porem ha um problema critico: **o trigger no banco de dados que dispara a notificacao nao existe**. A funcao `notify_driver_on_new_request()` esta criada, mas nunca e chamada porque o trigger nao foi aplicado na tabela `delivery_requests`.

### O que sera feito

**1. Criar o trigger no banco de dados**
- Criar o trigger `on_new_delivery_request_notify` na tabela `delivery_requests` para os eventos INSERT e UPDATE, chamando a funcao `notify_driver_on_new_request()` que ja existe e usa `pg_net` para invocar a edge function `notify-driver`.

**2. Adicionar som a notificacao push em segundo plano**
- Atualizar o service worker (`sw-push.js`) para incluir a propriedade `silent: false` nas opcoes da notificacao. Isso instrui o sistema operacional a tocar o som padrao de notificacao do dispositivo.
- Nota tecnica: Web Push nao permite enviar arquivos de audio customizados na notificacao em segundo plano. O som sera o padrao do dispositivo (tanto Android quanto iOS), que e o comportamento esperado e compativel com ambas plataformas.

**3. Reimplantar a edge function `notify-driver`**
- Reimplantar para garantir que esta atualizada e funcional.

### Compatibilidade

| Cenario | Android | iOS (PWA 16.4+) |
|---------|---------|-----------------|
| App em primeiro plano | Som customizado (mp3) + toast | Som customizado (mp3) + toast |
| App em segundo plano | Push + som do sistema | Push + som do sistema |
| App fechado | Push + som do sistema | Push + som do sistema |

### Detalhes tecnicos

**Migracao SQL:**
```sql
CREATE TRIGGER on_new_delivery_request_notify
  AFTER INSERT OR UPDATE ON public.delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_driver_on_new_request();
```

**Service Worker (`sw-push.js`):**
- Adicionar `silent: false` nas opcoes de `showNotification` para garantir que o som do sistema toque.

**Arquivos modificados:**
- `public/sw-push.js` - adicionar `silent: false`
- Nova migracao SQL para criar o trigger
- Reimplantacao da edge function `notify-driver`

