(function(){
  const firebaseConfig={
    apiKey:"AIzaSyCLP26K5agWGY6zTK2BFMZ0cqcg24t728U",
    authDomain:"shift-app-e606f.firebaseapp.com",
    projectId:"shift-app-e606f",
    storageBucket:"shift-app-e606f.firebasestorage.app",
    messagingSenderId:"337476175431",
    appId:"1:337476175431:web:29f3b99a33943f947b9362"
  };
  const BASE_KEY="shift_personal_save",MIGRATION_KEY="shift_personal_cloud_owner";
  const gate=document.getElementById("authGate"),loginButton=document.getElementById("authLoginButton"),status=document.getElementById("authStatus");
  let auth,db,currentUser=null,cloudReady=false,saveTimer=null;

  function requireLogin(message="Inicia sesión para acceder a tus datos."){
    document.body.classList.remove("auth-pending");document.body.classList.add("auth-required");
    loginButton.hidden=false;status.textContent=message;
  }
  function showApp(){document.body.classList.remove("auth-pending","auth-required");loginButton.hidden=true;status.textContent="Conectado"}
  function parseLocal(key){try{let raw=localStorage.getItem(key);return raw?JSON.parse(raw):null}catch(e){return null}}

  try{
    firebase.initializeApp(firebaseConfig);auth=firebase.auth();db=firebase.firestore();
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(()=>{});
  }catch(e){requireLogin("No se pudo conectar. Comprueba tu conexión a Internet.");return}

  window.shiftGoogleLogin=async function(){
    loginButton.hidden=true;status.textContent="Abriendo Google…";document.body.classList.add("auth-pending");
    try{let provider=new firebase.auth.GoogleAuthProvider();provider.setCustomParameters({prompt:"select_account"});await auth.signInWithPopup(provider)}
    catch(e){document.body.classList.remove("auth-pending");requireLogin("No se pudo abrir Google. Inténtalo de nuevo.")}
  };
  window.shiftLogout=async function(){cloudReady=false;document.body.classList.add("auth-pending");status.textContent="Cerrando sesión…";await auth.signOut()};
  window.queueCloudSave=function(state){
    if(!cloudReady||!currentUser)return;clearTimeout(saveTimer);let snapshot=JSON.parse(JSON.stringify(state));
    saveTimer=setTimeout(()=>db.collection("users").doc(currentUser.uid).set({state:snapshot,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),name:currentUser.displayName||"",email:currentUser.email||""},{merge:true}).catch(()=>{}),500);
  };

  auth.getRedirectResult().catch(()=>requireLogin("Google no pudo completar el acceso. Inténtalo de nuevo."));
  auth.onAuthStateChanged(async user=>{
    cloudReady=false;currentUser=user;
    if(!user){requireLogin();return}
    status.textContent="Cargando tus datos…";document.body.classList.add("auth-pending");
    const userKey=BASE_KEY+"_"+user.uid,ref=db.collection("users").doc(user.uid);
    try{
      const snap=await ref.get();let state=snap.exists?snap.data().state:parseLocal(userKey);
      if(!state){
        const migratedTo=localStorage.getItem(MIGRATION_KEY);
        if(!migratedTo){state=parseLocal(BASE_KEY)||window.getShiftState();localStorage.setItem(MIGRATION_KEY,user.uid)}
        else{let name=user.displayName||"Usuario",initials=name.split(/\s+/).map(x=>x[0]).join("").slice(0,3).toUpperCase();state={scheduleMode:"manual",profile:{name,initials,accent:"#59a8ff",theme:"default",layout:"comfortable"}}}
      }
      localStorage.setItem(userKey,JSON.stringify(state));window.activateShiftUser(user.uid,state,user);cloudReady=true;
      if(!snap.exists)await ref.set({state:window.getShiftState(),createdAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp(),name:user.displayName||"",email:user.email||""});
      showApp();
    }catch(e){
      let local=parseLocal(userKey);if(local){window.activateShiftUser(user.uid,local,user);showApp();status.textContent="Modo sin conexión"}
      else requireLogin("No se pudieron cargar tus datos. Inténtalo de nuevo.");
    }
  });
})();
