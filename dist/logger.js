"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = createDefaultLogger;

var _common = require("./common");

let SESSIONCOUNTER = 0;

function createDefaultLogger(username, hostname) {
  const session = ++SESSIONCOUNTER;

  const log = (level, messages) => {
    messages = messages.map(msg => typeof msg === 'function' ? msg() : msg);
    const date = new Date().toISOString();
    const logMessage = `[${date}][${session}][${username}][${hostname}] ${messages.join(' ')}`;

    if (level === _common.LOG_LEVEL_DEBUG) {
      console.log('[DEBUG]' + logMessage);
    } else if (level === _common.LOG_LEVEL_INFO) {
      console.info('[INFO]' + logMessage);
    } else if (level === _common.LOG_LEVEL_WARN) {
      console.warn('[WARN]' + logMessage);
    } else if (level === _common.LOG_LEVEL_ERROR) {
      console.error('[ERROR]' + logMessage);
    }
  };

  return {
    debug: msgs => log(_common.LOG_LEVEL_DEBUG, msgs),
    info: msgs => log(_common.LOG_LEVEL_INFO, msgs),
    warn: msgs => log(_common.LOG_LEVEL_WARN, msgs),
    error: msgs => log(_common.LOG_LEVEL_ERROR, msgs)
  };
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9sb2dnZXIuanMiXSwibmFtZXMiOlsiU0VTU0lPTkNPVU5URVIiLCJjcmVhdGVEZWZhdWx0TG9nZ2VyIiwidXNlcm5hbWUiLCJob3N0bmFtZSIsInNlc3Npb24iLCJsb2ciLCJsZXZlbCIsIm1lc3NhZ2VzIiwibWFwIiwibXNnIiwiZGF0ZSIsIkRhdGUiLCJ0b0lTT1N0cmluZyIsImxvZ01lc3NhZ2UiLCJqb2luIiwiTE9HX0xFVkVMX0RFQlVHIiwiY29uc29sZSIsIkxPR19MRVZFTF9JTkZPIiwiaW5mbyIsIkxPR19MRVZFTF9XQVJOIiwid2FybiIsIkxPR19MRVZFTF9FUlJPUiIsImVycm9yIiwiZGVidWciLCJtc2dzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7O0FBT0EsSUFBSUEsY0FBYyxHQUFHLENBQXJCOztBQUVlLFNBQVNDLG1CQUFULENBQThCQyxRQUE5QixFQUF3Q0MsUUFBeEMsRUFBa0Q7QUFDL0QsUUFBTUMsT0FBTyxHQUFHLEVBQUVKLGNBQWxCOztBQUNBLFFBQU1LLEdBQUcsR0FBRyxDQUFDQyxLQUFELEVBQVFDLFFBQVIsS0FBcUI7QUFDL0JBLElBQUFBLFFBQVEsR0FBR0EsUUFBUSxDQUFDQyxHQUFULENBQWFDLEdBQUcsSUFBSSxPQUFPQSxHQUFQLEtBQWUsVUFBZixHQUE0QkEsR0FBRyxFQUEvQixHQUFvQ0EsR0FBeEQsQ0FBWDtBQUNBLFVBQU1DLElBQUksR0FBRyxJQUFJQyxJQUFKLEdBQVdDLFdBQVgsRUFBYjtBQUNBLFVBQU1DLFVBQVUsR0FBSSxJQUFHSCxJQUFLLEtBQUlOLE9BQVEsS0FBSUYsUUFBUyxLQUFJQyxRQUFTLEtBQUlJLFFBQVEsQ0FBQ08sSUFBVCxDQUFjLEdBQWQsQ0FBbUIsRUFBekY7O0FBQ0EsUUFBSVIsS0FBSyxLQUFLUyx1QkFBZCxFQUErQjtBQUM3QkMsTUFBQUEsT0FBTyxDQUFDWCxHQUFSLENBQVksWUFBWVEsVUFBeEI7QUFDRCxLQUZELE1BRU8sSUFBSVAsS0FBSyxLQUFLVyxzQkFBZCxFQUE4QjtBQUNuQ0QsTUFBQUEsT0FBTyxDQUFDRSxJQUFSLENBQWEsV0FBV0wsVUFBeEI7QUFDRCxLQUZNLE1BRUEsSUFBSVAsS0FBSyxLQUFLYSxzQkFBZCxFQUE4QjtBQUNuQ0gsTUFBQUEsT0FBTyxDQUFDSSxJQUFSLENBQWEsV0FBV1AsVUFBeEI7QUFDRCxLQUZNLE1BRUEsSUFBSVAsS0FBSyxLQUFLZSx1QkFBZCxFQUErQjtBQUNwQ0wsTUFBQUEsT0FBTyxDQUFDTSxLQUFSLENBQWMsWUFBWVQsVUFBMUI7QUFDRDtBQUNGLEdBYkQ7O0FBZUEsU0FBTztBQUNMVSxJQUFBQSxLQUFLLEVBQUVDLElBQUksSUFBSW5CLEdBQUcsQ0FBQ1UsdUJBQUQsRUFBa0JTLElBQWxCLENBRGI7QUFFTE4sSUFBQUEsSUFBSSxFQUFFTSxJQUFJLElBQUluQixHQUFHLENBQUNZLHNCQUFELEVBQWlCTyxJQUFqQixDQUZaO0FBR0xKLElBQUFBLElBQUksRUFBRUksSUFBSSxJQUFJbkIsR0FBRyxDQUFDYyxzQkFBRCxFQUFpQkssSUFBakIsQ0FIWjtBQUlMRixJQUFBQSxLQUFLLEVBQUVFLElBQUksSUFBSW5CLEdBQUcsQ0FBQ2dCLHVCQUFELEVBQWtCRyxJQUFsQjtBQUpiLEdBQVA7QUFNRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIExPR19MRVZFTF9FUlJPUixcbiAgTE9HX0xFVkVMX1dBUk4sXG4gIExPR19MRVZFTF9JTkZPLFxuICBMT0dfTEVWRUxfREVCVUdcbn0gZnJvbSAnLi9jb21tb24nXG5cbmxldCBTRVNTSU9OQ09VTlRFUiA9IDBcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY3JlYXRlRGVmYXVsdExvZ2dlciAodXNlcm5hbWUsIGhvc3RuYW1lKSB7XG4gIGNvbnN0IHNlc3Npb24gPSArK1NFU1NJT05DT1VOVEVSXG4gIGNvbnN0IGxvZyA9IChsZXZlbCwgbWVzc2FnZXMpID0+IHtcbiAgICBtZXNzYWdlcyA9IG1lc3NhZ2VzLm1hcChtc2cgPT4gdHlwZW9mIG1zZyA9PT0gJ2Z1bmN0aW9uJyA/IG1zZygpIDogbXNnKVxuICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgICBjb25zdCBsb2dNZXNzYWdlID0gYFske2RhdGV9XVske3Nlc3Npb259XVske3VzZXJuYW1lfV1bJHtob3N0bmFtZX1dICR7bWVzc2FnZXMuam9pbignICcpfWBcbiAgICBpZiAobGV2ZWwgPT09IExPR19MRVZFTF9ERUJVRykge1xuICAgICAgY29uc29sZS5sb2coJ1tERUJVR10nICsgbG9nTWVzc2FnZSlcbiAgICB9IGVsc2UgaWYgKGxldmVsID09PSBMT0dfTEVWRUxfSU5GTykge1xuICAgICAgY29uc29sZS5pbmZvKCdbSU5GT10nICsgbG9nTWVzc2FnZSlcbiAgICB9IGVsc2UgaWYgKGxldmVsID09PSBMT0dfTEVWRUxfV0FSTikge1xuICAgICAgY29uc29sZS53YXJuKCdbV0FSTl0nICsgbG9nTWVzc2FnZSlcbiAgICB9IGVsc2UgaWYgKGxldmVsID09PSBMT0dfTEVWRUxfRVJST1IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tFUlJPUl0nICsgbG9nTWVzc2FnZSlcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGRlYnVnOiBtc2dzID0+IGxvZyhMT0dfTEVWRUxfREVCVUcsIG1zZ3MpLFxuICAgIGluZm86IG1zZ3MgPT4gbG9nKExPR19MRVZFTF9JTkZPLCBtc2dzKSxcbiAgICB3YXJuOiBtc2dzID0+IGxvZyhMT0dfTEVWRUxfV0FSTiwgbXNncyksXG4gICAgZXJyb3I6IG1zZ3MgPT4gbG9nKExPR19MRVZFTF9FUlJPUiwgbXNncylcbiAgfVxufVxuIl19