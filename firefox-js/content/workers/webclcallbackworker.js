/*
 * This file is part of WebCL – Web Computing Language.
 *
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL
 * was not distributed with this file, You can obtain
 * one at http://mozilla.org/MPL/2.0/.
 *
 * The Original Contributor of this Source Code Form is
 * Nokia Research Center Tampere (http://webcl.nokiaresearch.com).
 *
 */


try {


  var ENABLE_DEBUG = true;
  var ENABLE_CONSOLE = true;


  var puts = null;
  if (ENABLE_CONSOLE) {
    let libc = ctypes.open("libc.so.6");
    puts = libc.declare("puts", ctypes.default_abi, ctypes.int, ctypes.char.ptr);
  }
  function ERROR(msg) {
    console.log ("ERROR [webclcallbackworker.js] " + msg);
    if (puts) puts("ERROR [webclcallbackworker.js] " + msg);
  }
  function DEBUG(msg) {
    if (ENABLE_DEBUG)
    {
      console.log("DEBUG [webclcallbackworker.js] " + msg);
      if (puts) puts("DEBUG [webclcallbackworker.js] " + msg);
    }
  }


  var libHandle = null;
  var clCallSetEventCallback = null;
  var clWaitForEvents = null;

  var T_clEventCallback = ctypes.FunctionType(ctypes.default_abi,
                                              ctypes.void_t,
                                              [ ctypes.voidptr_t,
                                                ctypes.int32_t,
                                                ctypes.voidptr_t ]);

  function loadLibrary (libName)
  {
    if (!libName)
    {
      throw new Error ("WebCL addon location not available.");
    }
    libHandle = ctypes.open (libName);

    // rv:   T.cl_int,
    // args: [ T.cl_event, T.cl_int, T.callback_event.ptr, T.voidptr_t ]
    clCallSetEventCallback = libHandle.declare ("clSetEventCallback",
                                                ctypes.default_abi,
                                                ctypes.int32_t,
                                                ctypes.voidptr_t, ctypes.int32_t,
                                                T_clEventCallback.ptr, ctypes.voidptr_t);

    clWaitForEvents = libHandle.declare ("clWaitForEvents",
                                          ctypes.default_abi,
                                          ctypes.int32_t,
                                          ctypes.uint32_t, ctypes.voidptr_t);

  }


  function closeLibrary ()
  {
    libHandle.close ();
    libHandle = null;
  }

  function notifyCallback(event, execStatus, userData)
  {
    DEBUG('notifyCallback pre');

    let id = String(ctypes.cast(userData, ctypes.uint32_t).value);
    postMessage ({ cmd: "callback",
                   execStatus: execStatus,
                   id: id });
    DEBUG('notifyCallback post');

  }

  function callSetEventCallback (event, commandExecCallbackType, intUserData)
  {
    DEBUG('callSetEventCallback: event: ' + event + ' commandExecCallbackType: ' + commandExecCallbackType + ' intUserData: ' + intUserData);
    try {
      let clEvent = ctypes.cast(ctypes.intptr_t(event), ctypes.voidptr_t);
      let clCallbackType = ctypes.int32_t(+commandExecCallbackType);

      DEBUG('T_clEventCallback.ptr(notifyCallback) pre');
      //FIXME: crashes here with JS_AbortIfWrongThread
      //make this a void pointer just to test
      let clNotify = T_clEventCallback.ptr(notifyCallback);
      DEBUG('T_clEventCallback.ptr(notifyCallback) post');

      let clUserData = ctypes.cast(ctypes.intptr_t(+intUserData), ctypes.voidptr_t);

      DEBUG('clCallSetEventCallback pre');

      var ret = clCallSetEventCallback (clEvent, clCallbackType, clNotify, clUserData);
      DEBUG('clCallSetEventCallback post');

      return ret;
    }
    catch (e) {
      let s = (e&&e.stack ? "\n"+e.stack : "");
      ERROR ("callSetEventCallback:\n"+e+s);

      throw "WEBCL_IMPLEMENTATION_FAILURE";
    }
  }


  onmessage = function (event)
  {
    try
    {
      if (!event.isTrusted) {
        ERROR ("onmessage: Untrusted event received! data="+event.data);
        return;
      }


      switch (event.data.cmd)
      {
        case "load":
          DEBUG ("Loading OpenCL library " + event.data.libname);
          loadLibrary (event.data.libname);

          postMessage(event.data);
          break;

        case "close":
          if (libHandle) {
            DEBUG ("Closing OpenCL library.");
            closeCLLibrary (libHandle);
          }
          libHandle = null;

          postMessage(event.data);
          self.close ();
          break;

        case "setEventCallback":
          try
          {
            DEBUG('callSetEventCallback pre');

            // let rv = callSetEventCallback (event.data.event,
            //                                event.data.callbackType,
            //                                event.data.callbackId);
            DEBUG('callSetEventCallback post');

            event.data.rv = 0;//rv;
            postMessage (event.data);

            let clNumEvents = 1;
            let clEventArray = ctypes.voidptr_t.array(clNumEvents)();
            let clEvent = ctypes.cast(ctypes.intptr_t(event.data.event), ctypes.voidptr_t);
            clEventArray[0] = clEvent;
            let clEventArrayPtr = ctypes.cast (clEventArray.address(), ctypes.voidptr_t);
            let ret = clWaitForEvents(clNumEvents, clEventArrayPtr);

            //TODO: call callback if event status matches

            if(true) // execStatus == event.data.callbackType;
            {
              let clUserData = ctypes.cast(ctypes.intptr_t(+event.data.callbackId), ctypes.voidptr_t);
              notifyCallback(event, event.data.callbackType, clUserData);
              DEBUG('callSetEventCallback after');
            }
          }
          catch (e)
          {
            ERROR (e+"\n"+e.stack);

            event.data.err = e;
            postMessage (event.data);
          }
          break;

        default:
        {
          ERROR ("onmessage: Unknown command: '"+event.data.cmd+"'.");
        }
      }

    }
    catch (e)
    {
      ERROR (e+"\n"+e.stack);
      event.data.err = String(e);
      postMessage (event.data);
    }
  }



} catch(e) { ERROR (e+"\n"+e.stack); }
