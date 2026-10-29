/* DIGIgyde browser storage layer. Data remains in this browser. */
(function(){
  const KEY="digigyde_frontend_v1";
  const now=()=>new Date().toISOString();
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY))}catch(e){return null}};
  const write=data=>localStorage.setItem(KEY,JSON.stringify(data));
  function seed(){
    if(read()) return;
    const data={
      users:[
        {id:"admin-001",name:"DIGIgyde Administrator",email:"admin@digigyde.local",password:"Admin123!",role:"admin",status:"Active",createdAt:now(),phone:"",address:"Barangay Hall",photo:""},
        {id:"resident-001",name:"Alex Santos",email:"resident@digigyde.local",password:"Resident123!",role:"resident",status:"Active",createdAt:now(),phone:"09171234567",address:"Sample Street, Barangay",photo:""},
        {id:"resident-002",name:"Jamie Reyes",email:"jamie@example.local",password:"Resident123!",role:"resident",status:"Active",createdAt:now(),phone:"",address:"",photo:""}
      ],
      requests:[
        {id:"DGY-2026-0001",userId:"resident-001",residentName:"Alex Santos",service:"Barangay Clearance",purpose:"Employment requirement",details:"Sample request.",status:"Processing",createdAt:now(),updatedAt:now(),adminNote:"Under review",history:[{status:"Pending",date:now()},{status:"Processing",date:now(),note:"Under review"}],attachment:""},
        {id:"DGY-2026-0002",userId:"resident-002",residentName:"Jamie Reyes",service:"Certificate of Residency",purpose:"School requirement",details:"Sample request.",status:"Pending",createdAt:now(),updatedAt:now(),adminNote:"",history:[{status:"Pending",date:now()}],attachment:""}
      ],
      announcements:[
        {id:"ann-1",title:"Welcome to DIGIgyde",body:"Explore the digital community services portal and learn how to submit and track requests.",date:now(),active:true},
        {id:"ann-2",title:"Prepare your requirements",body:"Please review each service's requirements before submitting a request.",date:now(),active:true}
      ],
      notifications:[],
      audit:[{id:"audit-1",actor:"System",action:"Demo data initialized",target:"Application",date:now()}]
    };
    write(data);
  }
  function get(){seed();return read()}
  function set(data){write(data)}
  function addAudit(actor,action,target){const d=get();d.audit.unshift({id:"audit-"+Date.now(),actor,action,target,date:now()});d.audit=d.audit.slice(0,150);set(d)}
  function nextRequestId(){
    const d=get();
    const year = new Date().getFullYear();
    const prefix = `DGY-${year}-`;
    const existing = d.requests.filter(r=>r.id.startsWith(prefix)).map(r=>parseInt(r.id.split("-")[2])||0);
    const nextNum = existing.length ? Math.max(...existing) + 1 : 1;
    return prefix + String(nextNum).padStart(4, "0");
  }

  window.DigiStore={
    get, set,
    current(){return sessionStorage.getItem("digigyde_session")||""},
    session(id){if(id)sessionStorage.setItem("digigyde_session",id);else sessionStorage.removeItem("digigyde_session")},
    user(){const id=this.current();return get().users.find(u=>u.id===id)||null},
    signIn(email,password,role){
      const d=get();
      const normalizedEmail=email.trim().toLowerCase();
      const userByEmail=d.users.find(x=>x.email.toLowerCase()===normalizedEmail);

      if(!userByEmail) return {error:"No account is registered with this email address. Please check your email or create an account.", field:"email"};
      if(userByEmail.role!==role) return {error:`This account is registered as a ${userByEmail.role==="admin"?"Administrator":"Resident"} account, not ${role==="admin"?"Administrator":"Resident"}. Please select the correct portal above.`, field:"email"};
      if(userByEmail.status!=="Active") return {error:"This account is currently suspended. Please contact the administrator for assistance.", field:"email"};
      if(userByEmail.password!==password) return {error:"Incorrect password for this email address. Please try again.", field:"password"};

      this.session(userByEmail.id);
      addAudit(userByEmail.name,"Signed in",userByEmail.role+" portal");
      return {user:userByEmail};
    },
    register(form){const d=get();if(d.users.some(u=>u.email.toLowerCase()===form.email.trim().toLowerCase()))return {error:"An account with this email already exists."};const u={id:"user-"+Date.now(),name:form.name.trim(),email:form.email.trim().toLowerCase(),password:form.password,role:"resident",status:"Active",phone:form.phone.trim(),address:form.address.trim(),createdAt:now(),photo:""};d.users.push(u);d.notifications.push({id:"n-"+Date.now(),userId:u.id,title:"Welcome to DIGIgyde",body:"Your DIGIgyde account has been created.",date:now(),read:false,link:"profile"});set(d);addAudit(u.name,"Registered account",u.email);this.session(u.id);return {user:u}},
    createRequest(form){const u=this.user();const d=get();const newId=nextRequestId();const r={id:newId,userId:u.id,residentName:u.name,service:form.service,purpose:form.purpose,details:form.details,status:"Pending",createdAt:now(),updatedAt:now(),adminNote:"",history:[{status:"Pending",date:now()}],attachment:form.attachment||""};d.requests.unshift(r);d.notifications.unshift({id:"n-"+Date.now(),userId:u.id,title:"Request submitted",body:"Your "+r.service+" request ("+r.id+") was submitted.",date:now(),read:false,link:"requests"});set(d);addAudit(u.name,"Submitted request",r.id);return r},
    updateRequest(id,status,note){const d=get(),r=d.requests.find(x=>x.id===id);if(!r)return false;r.status=status;r.adminNote=note||"";r.updatedAt=now();r.history.push({status,date:now(),note:note||""});d.notifications.unshift({id:"n-"+Date.now(),userId:r.userId,title:"Request status updated",body:r.id+" is now "+status+". "+(note||""),date:now(),read:false,link:"requests"});set(d);addAudit(this.user()?.name||"Administrator","Updated request",id+" → "+status);return true},
    cancelRequest(id){const d=get(),r=d.requests.find(x=>x.id===id);if(!r)return false;r.status="Cancelled";r.updatedAt=now();r.history.push({status:"Cancelled",date:now(),note:"Cancelled by resident"});set(d);addAudit(this.user()?.name||"Resident","Cancelled request",id);return true},
    updateProfile(form){const d=get(),u=d.users.find(x=>x.id===this.current());if(!u)return false;u.name=form.name.trim();u.phone=form.phone.trim();u.address=form.address.trim();if(typeof form.photo==="string")u.photo=form.photo;set(d);addAudit(u.name,"Updated profile","Profile");return true},
    changePassword(currentPass,newPass){const d=get(),u=d.users.find(x=>x.id===this.current());if(!u)return {error:"User not found."};if(u.password!==currentPass)return {error:"Current password is incorrect."};u.password=newPass;set(d);addAudit(u.name,"Changed password","Account");return {success:true}},
    addAnnouncement(title,body){const d=get();d.announcements.unshift({id:"ann-"+Date.now(),title,body,date:now(),active:true});set(d);addAudit(this.user()?.name||"Administrator","Published announcement",title)},
    markRead(id){const d=get();d.notifications.filter(n=>n.userId===this.current()).forEach(n=>{if(!id||n.id===id)n.read=true});set(d)},
    markAllRead(){const d=get();d.notifications.filter(n=>n.userId===this.current()).forEach(n=>n.read=true);set(d)},
    resetDemo(){localStorage.removeItem(KEY);sessionStorage.removeItem("digigyde_session");seed()},
    time:now
  };
  seed();
})();