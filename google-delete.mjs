import {createClient,CLIENT} from './google-account.mjs';
const el=id=>document.getElementById(id),client=createClient();
let en=false,busy=false,ready=false,last='loading';
const strings={
 title:['Удаление игрового аккаунта через Google','Delete your game account with Google'],
 intro:['Устанавливать игру и подтверждать почту письмом не нужно. Войдите тем же Google-аккаунтом, который использовали в игре. Вход сам по себе ничего не удаляет.','No game installation or email code is needed. Sign in with the same Google account you used in the game. Signing in does not delete anything.'],
 confirmTitle:['Проверьте действие','Review this action'],
 warning:['Будут удалены игровой профиль RivenShifters, прогресс, инвентарь и связанные данные. Ваш Google-аккаунт останется. Удаление необратимо. Минимальная служебная запись хранится 365 дней согласно политике конфиденциальности.','Your RivenShifters game profile, progress, inventory and associated data will be deleted permanently. Your Google account remains. A minimal deletion receipt is retained for 365 days as described in the privacy policy.'],
 agree:['Подтверждаю удаление моего игрового аккаунта и прогресса.','I confirm deletion of my game account and progress.'],
 erase:['Удалить игровой аккаунт','Delete game account'],cancel:['Отмена','Cancel'],resume:['Продолжить ранее подтверждённое удаление','Resume previously confirmed deletion'],
 recovery:['После подтверждения этот браузер сохраняет только защищённый код продолжения удаления, чтобы завершить операцию при обрыве связи. Не очищайте данные сайта до завершения. Пароли и токены входа на диск не записываются.','After confirmation, this browser stores a restricted deletion recovery code so you can finish after a connection failure. Do not clear site data until completion. Passwords and sign-in tokens are not stored on disk.'],
 support:['Другой способ входа или нужна помощь — обратиться в поддержку','Another sign-in method or need help? Contact support'],privacy:['Конфиденциальность и сроки хранения','Privacy and retention'],
 loading:['Загрузка входа Google…','Loading Google sign-in…'],signin:['Войдите тем же аккаунтом, что и в игре.','Sign in with the account used in the game.'],
 verified:['Google-аккаунт проверен. Удаление ещё не начато.','Google account verified. Deletion has not started.'],working:['Выполняется проверка. Не закрывайте страницу.','Processing. Keep this page open.'],
 complete:['Игровой аккаунт и данные удалены. Google-аккаунт сохранён.','Game account and data deleted. Your Google account remains.'],
 pending:['Удаление ещё не завершено. Нажмите «Продолжить».','Deletion is not complete yet. Select Resume.'],
 error:['Не удалось завершить действие. Если запрос уже подтверждён, используйте «Продолжить». Иначе войдите заново. Если аккаунт не найден или ошибка повторяется, обратитесь в поддержку. Не присылайте пароли или токены.','Unable to finish. For a confirmed request, select Resume; otherwise sign in again. If the account cannot be found or the error persists, contact support. Never send passwords or tokens.'],
 expired:['Подтверждение входа истекло. Войдите через Google заново.','Sign-in confirmation expired. Sign in with Google again.'],
 cancelled:['Удаление не подтверждено.','Deletion was not confirmed.']};
function show(s){last=s;el('status').textContent=strings[s][en?1:0];}
function render(){document.documentElement.lang=en?'en':'ru';for(const n of document.querySelectorAll('[data-i]'))n.textContent=strings[n.dataset.i][en?1:0];el('language').textContent=en?'Русский':'English';show(last);}
function controls(){el('erase').disabled=busy||!ready||!el('agree').checked;el('cancel').disabled=busy;el('resume').disabled=busy;el('confirmation').hidden=!ready;try{el('resume').hidden=!client.pending();}catch{show('error');}}
async function run(action){if(busy)return;busy=true;show('working');controls();try{await action();}catch(e){ready=false;show('error');const safe=/^(HTTP_\d{3}|IDENTITY_MISMATCH|SUPPORT_REQUIRED|OTHER_PENDING_ACCOUNT|FRESH_CONFIRMATION_REQUIRED|INVALID_RECEIPT|RECEIPT_MISMATCH|STORAGE_REQUIRED)$/.test(e.message)?e.message:'NETWORK_OR_BROWSER';el('status').textContent+=' ['+safe+']';}finally{busy=false;controls();}}
el('language').onclick=()=>{en=!en;render();};el('agree').onchange=controls;
el('cancel').onclick=()=>{client.signOut();ready=false;el('agree').checked=false;show('cancelled');controls();};
el('erase').onclick=()=>run(async()=>{if(!el('agree').checked||!ready)return;const s=await client.remove('DELETE_RIVENSHIFTERS_GAME_ACCOUNT');ready=false;show(s);});
el('resume').onclick=()=>run(async()=>{ready=false;show(await client.resume());});
function initialize(){if(!window.google?.accounts?.id)return false;google.accounts.id.initialize({client_id:CLIENT,auto_select:false,callback:r=>run(async()=>{await client.signIn(r.credential);r.credential=null;ready=true;el('agree').checked=false;show('verified');setTimeout(()=>{if(ready){ready=false;client.signOut();show('expired');controls();}},300000);})});google.accounts.id.renderButton(el('google'),{type:'standard',theme:'outline',size:'large',text:'signin_with',width:280});show('signin');return true;}
render();controls();let attempts=0;const timer=setInterval(()=>{if(initialize()||++attempts>=30){clearInterval(timer);if(attempts>=30)show('error');}},500);
