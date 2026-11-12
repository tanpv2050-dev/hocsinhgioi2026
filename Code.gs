const T={
  USERS:["id","username","hash","salt","name","role","teamId","active","createdAt"],
  TEAMS:["id","name","active"],
  ASSIGNMENTS:["id","title","statement","createdBy","createdAt","dueAt","maxAttempts","extensions","targetType","targetId","active","attachmentFileId","attachmentName"],
  SUBMISSIONS:["id","assignmentId","userId","attempt","submittedAt","fileId","fileName","mimeType","size","comment"]
};
const MAX_BYTES=8*1024*1024;
function doGet(){return HtmlService.createHtmlOutputFromFile("Index").setTitle("Đội tuyển Tin học").addMetaTag("viewport","width=device-width, initial-scale=1");}
function setupSystem(){
  const p=PropertiesService.getScriptProperties();
  if(p.getProperty("DB_ID"))throw Error("Hệ thống đã khởi tạo.");
  const ss=SpreadsheetApp.create("DU LIEU DOI TUYEN TIN HOC");
  Object.keys(T).forEach(k=>{let s=ss.getSheetByName(k)||ss.insertSheet(k);s.clear();s.appendRow(T[k]);s.setFrozenRows(1);s.getRange(1,1,1,T[k].length).setFontWeight("bold");});
  const def=ss.getSheetByName("Sheet1");if(def)ss.deleteSheet(def);
  const root=DriveApp.createFolder("DOI TUYEN TIN HOC - FILE");
  const sub=root.createFolder("BAI_NOP");root.createFolder("DE_BAI");
  p.setProperties({DB_ID:ss.getId(),ROOT_ID:root.getId(),SUB_ID:sub.getId()});
  const pw=Utilities.getUuid().replace(/-/g,"").slice(0,14)+"aA1!";
  addUser_({username:"admin",password:pw,name:"Quản trị viên",role:"ADMIN"});
  Logger.log("Spreadsheet: "+ss.getUrl());Logger.log("Drive: "+root.getUrl());
  Logger.log("Tai khoan admin / Mat khau tam thoi: "+pw);
  return "Đã khởi tạo. Mở Execution log để lấy mật khẩu admin.";
}
function db_(){const id=PropertiesService.getScriptProperties().getProperty("DB_ID");if(!id)throw Error("Chưa khởi tạo. Chạy setupSystem().");return SpreadsheetApp.openById(id);}
function sh_(n){return db_().getSheetByName(n);}
function rows_(n){const v=sh_(n).getDataRange().getValues(),h=v.shift();return v.filter(r=>r.some(x=>x!=="")).map(r=>Object.fromEntries(h.map((x,i)=>[x,r[i]])));}
function add_(n,o){sh_(n).appendRow(T[n].map(k=>o[k]===undefined?"":o[k]));}
function patch_(n,id,changes){const s=sh_(n),v=s.getDataRange().getValues(),h=v[0],c=h.indexOf("id");for(let i=1;i<v.length;i++)if(String(v[i][c])===String(id)){Object.keys(changes).forEach(k=>{let j=h.indexOf(k);if(j>=0)s.getRange(i+1,j+1).setValue(changes[k]);});return true;}return false;}
function uid_(){return Utilities.getUuid();}
function serial_(x){return JSON.parse(JSON.stringify(x));}
function hash_(p,s){return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,s+String(p),Utilities.Charset.UTF_8));}
function addUser_(x){const salt=uid_(),u={id:uid_(),username:x.username.toLowerCase(),hash:hash_(x.password,salt),salt,name:x.name,role:x.role,teamId:x.teamId||"",active:true,createdAt:new Date()};add_("USERS",u);return u;}
function pub_(u){return {id:u.id,username:u.username,name:u.name,role:u.role,teamId:u.teamId,active:u.active===true||String(u.active)==="true"};}
function login(username,password){const u=rows_("USERS").find(x=>x.username===String(username||"").trim().toLowerCase()&&(x.active===true||String(x.active)==="true"));if(!u||hash_(password||"",u.salt)!==u.hash)throw Error("Tên đăng nhập hoặc mật khẩu không đúng.");const token=uid_()+uid_();CacheService.getScriptCache().put("sess_"+token,u.id,21600);return {token,user:pub_(u)};}
function auth_(token){const id=CacheService.getScriptCache().get("sess_"+token);if(!id)throw Error("Phiên hết hạn, vui lòng đăng nhập lại.");const u=rows_("USERS").find(x=>x.id===id);if(!u||!(u.active===true||String(u.active)==="true"))throw Error("Tài khoản không hoạt động.");return u;}
function logout(t){CacheService.getScriptCache().remove("sess_"+t);return true;}
function teacher_(u){if(!["ADMIN","TEACHER"].includes(u.role))throw Error("Không đủ quyền.");}
function admin_(u){if(u.role!=="ADMIN")throw Error("Chỉ quản trị viên được thực hiện.");}
function listTeams(t){teacher_(auth_(t));return rows_("TEAMS").filter(x=>x.active===true||String(x.active)==="true");}
function saveTeam(t,d){admin_(auth_(t));if(!String(d.name||"").trim())throw Error("Nhập tên đội/nhóm.");let x={id:uid_(),name:String(d.name).trim(),active:true};add_("TEAMS",x);return x;}
function listUsers(t){teacher_(auth_(t));return rows_("USERS").map(pub_);}
function saveUser(t,d){teacher_(auth_(t));let username=String(d.username||"").trim().toLowerCase(),name=String(d.name||"").trim(),role=d.role==="TEACHER"?"TEACHER":"STUDENT",password=String(d.password||"");if(!/^[a-z0-9._-]{3,30}$/.test(username))throw Error("Tên đăng nhập 3–30 ký tự, chỉ dùng chữ thường, số, dấu . _ -.");if(!name)throw Error("Nhập họ tên.");if(password.length<8)throw Error("Mật khẩu tối thiểu 8 ký tự.");if(rows_("USERS").some(x=>x.username===username))throw Error("Tên đăng nhập đã tồn tại.");return pub_(addUser_({username,password,name,role,teamId:d.teamId||""}));}
function changePassword(t,oldP,newP){let u=auth_(t);if(String(newP||"").length<8)throw Error("Mật khẩu mới tối thiểu 8 ký tự.");let full=rows_("USERS").find(x=>x.id===u.id);if(hash_(oldP,full.salt)!==full.hash)throw Error("Mật khẩu hiện tại không đúng.");let salt=uid_();patch_("USERS",u.id,{salt,hash:hash_(newP,salt)});return true;}
function targets_(u){let a=rows_("ASSIGNMENTS").filter(x=>x.active===true||String(x.active)==="true");if(u.role!=="STUDENT")return a;return a.filter(x=>x.targetType==="ALL"||(x.targetType==="TEAM"&&x.targetId===u.teamId)||(x.targetType==="USER"&&x.targetId===u.id));}
function listAssignments(t){let u=auth_(t);return serial_(targets_(u).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(a=>({...a,attemptCount:rows_("SUBMISSIONS").filter(s=>s.assignmentId===a.id&&(u.role!=="STUDENT"||s.userId===u.id)).length})));}
function saveAssignment(t,d){let u=auth_(t);teacher_(u);let title=String(d.title||"").trim(),statement=String(d.statement||"").trim(),type=d.targetType||"ALL",targetId=type==="ALL"?"ALL":String(d.targetId||"");if(!title||!statement)throw Error("Nhập tên và nội dung đề.");if(!["ALL","TEAM","USER"].includes(type)||(!targetId&&type!=="ALL"))throw Error("Chọn đối tượng giao bài.");let attachmentFileId="",attachmentName="";
 if(d.attachmentBase64){
  let bytes=Utilities.base64Decode(String(d.attachmentBase64));
  if(!bytes.length||bytes.length>MAX_BYTES)throw Error("File đề rỗng hoặc vượt quá 8 MB.");
  attachmentName=String(d.attachmentName||"De_bai").replace(/[\\\\/:*?"<>|]/g,"_").slice(0,120);
  let folder=folder_(DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty("ROOT_ID")).getFoldersByName("DE_BAI").hasNext()?DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty("ROOT_ID")).getFoldersByName("DE_BAI").next():DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty("ROOT_ID")).createFolder("DE_BAI"),uid_());
  let f=folder.createFile(Utilities.newBlob(bytes,d.attachmentMimeType||"application/octet-stream",attachmentName));attachmentFileId=f.getId();
 }
 let x={id:uid_(),title,statement,createdBy:u.id,createdAt:new Date(),dueAt:d.dueAt?new Date(d.dueAt):"",maxAttempts:Math.max(1,Math.min(100,Number(d.maxAttempts)||3)),extensions:String(d.extensions||"cpp,py,pas,java,zip,pdf,docx,txt").toLowerCase().replace(/[^a-z0-9,]/g,""),targetType:type,targetId,active:true,attachmentFileId,attachmentName};add_("ASSIGNMENTS",x);return serial_(x);}
function getAssignment(t,id){let u=auth_(t),a=targets_(u).find(x=>x.id===id);if(!a)throw Error("Không tìm thấy bài hoặc không có quyền xem.");return serial_(a);}
function history(t,id){let u=auth_(t);getAssignment(t,id);return serial_(rows_("SUBMISSIONS").filter(s=>s.assignmentId===id&&(u.role!=="STUDENT"||s.userId===u.id)).sort((a,b)=>Number(a.attempt)-Number(b.attempt)).map(s=>({...s,studentName:rows_("USERS").find(x=>x.id===s.userId)?.name||""})));}
function submit(t,d){
 const lock=LockService.getScriptLock();lock.waitLock(20000);
 try{
  let u=auth_(t);if(u.role!=="STUDENT")throw Error("Chỉ học sinh được nộp bài.");
  let a=getAssignment(t,d.assignmentId);if(a.dueAt&&new Date(a.dueAt).getTime()<Date.now())throw Error("Đã quá hạn nộp.");
  let old=rows_("SUBMISSIONS").filter(s=>s.assignmentId===a.id&&s.userId===u.id);if(old.length>=Number(a.maxAttempts))throw Error("Đã hết số lần nộp.");
  let name=String(d.fileName||"").replace(/[\\\\/:*?"<>|]/g,"_").slice(0,120),ext=name.includes(".")?name.split(".").pop().toLowerCase():"";
  let allowed=String(a.extensions).split(",").map(x=>x.trim());if(!name||!allowed.includes(ext))throw Error("Định dạng không được phép: "+allowed.join(", "));
  let bytes=Utilities.base64Decode(String(d.base64||""));if(!bytes.length||bytes.length>MAX_BYTES)throw Error("File rỗng hoặc vượt quá 8 MB.");
  let root=DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty("SUB_ID")),af=folder_(root,a.id),sf=folder_(af,u.username),attempt=old.length+1;
  let file=sf.createFile(Utilities.newBlob(bytes,d.mimeType||"application/octet-stream","LAN_"+String(attempt).padStart(2,"0")+"_"+name));
  let s={id:uid_(),assignmentId:a.id,userId:u.id,attempt,submittedAt:new Date(),fileId:file.getId(),fileName:name,mimeType:d.mimeType||"application/octet-stream",size:bytes.length,comment:String(d.comment||"").slice(0,1000)};add_("SUBMISSIONS",s);return {success:true,attempt};
 }finally{lock.releaseLock();}
}
function folder_(p,n){let i=p.getFoldersByName(n);return i.hasNext()?i.next():p.createFolder(n);}
function download(t,id){let u=auth_(t),s=rows_("SUBMISSIONS").find(x=>x.id===id);if(!s)throw Error("Không tìm thấy file.");if(u.role==="STUDENT"&&s.userId!==u.id)throw Error("Không có quyền.");if(u.role!=="STUDENT")teacher_(u);return {fileName:s.fileName,mimeType:s.mimeType,base64:Utilities.base64Encode(DriveApp.getFileById(s.fileId).getBlob().getBytes())};}
function overview(t,id){let u=auth_(t);teacher_(u);let a=rows_("ASSIGNMENTS").find(x=>x.id===id);if(!a)throw Error("Không tìm thấy bài.");let students=rows_("USERS").filter(x=>x.role==="STUDENT"&&(x.active===true||String(x.active)==="true")).filter(s=>a.targetType==="ALL"||(a.targetType==="TEAM"&&a.targetId===s.teamId)||(a.targetType==="USER"&&a.targetId===s.id));let subs=rows_("SUBMISSIONS").filter(s=>s.assignmentId===id);return serial_(students.map(s=>({...pub_(s),submissions:subs.filter(x=>x.userId===s.id)})));}
function dashboard(t){let u=auth_(t),a=targets_(u),s=rows_("SUBMISSIONS").filter(x=>u.role!=="STUDENT"||x.userId===u.id);return {assignmentCount:a.length,submissionCount:s.length,studentCount:rows_("USERS").filter(x=>x.role==="STUDENT"&&(x.active===true||String(x.active)==="true")).length};}

function downloadAssignmentAttachment(t,id){
 let u=auth_(t),a=targets_(u).find(x=>x.id===id);
 if(!a||!a.attachmentFileId)throw Error("Không có file đính kèm hoặc bạn không có quyền xem.");
 let f=DriveApp.getFileById(a.attachmentFileId);
 return {fileName:a.attachmentName,mimeType:f.getMimeType(),base64:Utilities.base64Encode(f.getBlob().getBytes())};
}
