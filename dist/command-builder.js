"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.buildFETCHCommand = buildFETCHCommand;
exports.buildSEARCHCommand = buildSEARCHCommand;
exports.buildSTORECommand = buildSTORECommand;
exports.buildXOAuth2Token = buildXOAuth2Token;

var _emailjsImapHandler = require("emailjs-imap-handler");

var _emailjsMimeCodec = require("emailjs-mime-codec");

var _emailjsBase = require("emailjs-base64");

var _common = require("./common");

/**
 * Builds a FETCH command
 *
 * @param {String} sequence Message range selector
 * @param {Array} items List of elements to fetch (eg. `['uid', 'envelope']`).
 * @param {Object} [options] Optional options object. Use `{byUid:true}` for `UID FETCH`
 * @returns {Object} Structured IMAP command
 */
function buildFETCHCommand(sequence, items, options) {
  const command = {
    command: options.byUid ? 'UID FETCH' : 'FETCH',
    attributes: [{
      type: 'SEQUENCE',
      value: sequence
    }]
  };

  if (options.valueAsString !== undefined) {
    command.valueAsString = options.valueAsString;
  }

  let query = [];
  items.forEach(item => {
    item = item.toUpperCase().trim();

    if (/^\w+$/.test(item)) {
      // alphanum strings can be used directly
      query.push({
        type: 'ATOM',
        value: item
      });
    } else if (item) {
      try {
        // parse the value as a fake command, use only the attributes block
        const cmd = (0, _emailjsImapHandler.parser)((0, _common.toTypedArray)('* Z ' + item));
        query = query.concat(cmd.attributes || []);
      } catch (e) {
        // if parse failed, use the original string as one entity
        query.push({
          type: 'ATOM',
          value: item
        });
      }
    }
  });

  if (query.length === 1) {
    query = query.pop();
  }

  command.attributes.push(query);

  if (options.changedSince) {
    command.attributes.push([{
      type: 'ATOM',
      value: 'CHANGEDSINCE'
    }, {
      type: 'ATOM',
      value: options.changedSince
    }]);
  }

  return command;
}
/**
 * Builds a login token for XOAUTH2 authentication command
 *
 * @param {String} user E-mail address of the user
 * @param {String} token Valid access token for the user
 * @return {String} Base64 formatted login token
 */


function buildXOAuth2Token(user = '', token) {
  const authData = [`user=${user}`, `auth=Bearer ${token}`, '', ''];
  return (0, _emailjsBase.encode)(authData.join('\x01'));
}
/**
 * Compiles a search query into an IMAP command. Queries are composed as objects
 * where keys are search terms and values are term arguments. Only strings,
 * numbers and Dates are used. If the value is an array, the members of it
 * are processed separately (use this for terms that require multiple params).
 * If the value is a Date, it is converted to the form of "01-Jan-1970".
 * Subqueries (OR, NOT) are made up of objects
 *
 *    {unseen: true, header: ["subject", "hello world"]};
 *    SEARCH UNSEEN HEADER "subject" "hello world"
 *
 * @param {Object} query Search query
 * @param {Object} [options] Option object
 * @param {Boolean} [options.byUid] If ture, use UID SEARCH instead of SEARCH
 * @return {Object} IMAP command object
 */


function buildSEARCHCommand(query = {}, options = {}) {
  const command = {
    command: options.byUid ? 'UID SEARCH' : 'SEARCH'
  };
  let isAscii = true;

  const buildTerm = query => {
    let list = [];
    Object.keys(query).forEach(key => {
      let params = [];

      const formatDate = date => date.toUTCString().replace(/^\w+, 0?(\d+) (\w+) (\d+).*/, '$1-$2-$3');

      const escapeParam = param => {
        if (typeof param === 'number') {
          return {
            type: 'number',
            value: param
          };
        } else if (typeof param === 'string') {
          if (/[\u0080-\uFFFF]/.test(param)) {
            isAscii = false;
            return {
              type: 'literal',
              value: (0, _common.fromTypedArray)((0, _emailjsMimeCodec.encode)(param)) // cast unicode string to pseudo-binary as imap-handler compiles strings as octets

            };
          }

          return {
            type: 'string',
            value: param
          };
        } else if (Object.prototype.toString.call(param) === '[object Date]') {
          // RFC 3501 allows for dates to be placed in
          // double-quotes or left without quotes.  Some
          // servers (Yandex), do not like the double quotes,
          // so we treat the date as an atom.
          return {
            type: 'atom',
            value: formatDate(param)
          };
        } else if (Array.isArray(param)) {
          return param.map(escapeParam);
        } else if (typeof param === 'object') {
          return buildTerm(param);
        }
      };

      params.push({
        type: 'atom',
        value: key.toUpperCase()
      });
      [].concat(query[key] || []).forEach(param => {
        switch (key.toLowerCase()) {
          case 'uid':
            param = {
              type: 'sequence',
              value: param
            };
            break;
          // The Gmail extension values of X-GM-THRID and
          // X-GM-MSGID are defined to be unsigned 64-bit integers
          // and they must not be quoted strings or the server
          // will report a parse error.

          case 'x-gm-thrid':
          case 'x-gm-msgid':
            param = {
              type: 'number',
              value: param
            };
            break;

          default:
            param = escapeParam(param);
        }

        if (param) {
          params = params.concat(param || []);
        }
      });
      list = list.concat(params || []);
    });
    return list;
  };

  command.attributes = buildTerm(query); // If any string input is using 8bit bytes, prepend the optional CHARSET argument

  if (!isAscii) {
    command.attributes.unshift({
      type: 'atom',
      value: 'UTF-8'
    });
    command.attributes.unshift({
      type: 'atom',
      value: 'CHARSET'
    });
  }

  return command;
}
/**
 * Creates an IMAP STORE command from the selected arguments
 */


function buildSTORECommand(sequence, action = '', flags = [], options = {}) {
  const command = {
    command: options.byUid ? 'UID STORE' : 'STORE',
    attributes: [{
      type: 'sequence',
      value: sequence
    }]
  };
  command.attributes.push({
    type: 'atom',
    value: action.toUpperCase() + (options.silent ? '.SILENT' : '')
  });
  command.attributes.push(flags.map(flag => {
    return {
      type: 'atom',
      value: flag
    };
  }));
  return command;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jb21tYW5kLWJ1aWxkZXIuanMiXSwibmFtZXMiOlsiYnVpbGRGRVRDSENvbW1hbmQiLCJzZXF1ZW5jZSIsIml0ZW1zIiwib3B0aW9ucyIsImNvbW1hbmQiLCJieVVpZCIsImF0dHJpYnV0ZXMiLCJ0eXBlIiwidmFsdWUiLCJ2YWx1ZUFzU3RyaW5nIiwidW5kZWZpbmVkIiwicXVlcnkiLCJmb3JFYWNoIiwiaXRlbSIsInRvVXBwZXJDYXNlIiwidHJpbSIsInRlc3QiLCJwdXNoIiwiY21kIiwiY29uY2F0IiwiZSIsImxlbmd0aCIsInBvcCIsImNoYW5nZWRTaW5jZSIsImJ1aWxkWE9BdXRoMlRva2VuIiwidXNlciIsInRva2VuIiwiYXV0aERhdGEiLCJqb2luIiwiYnVpbGRTRUFSQ0hDb21tYW5kIiwiaXNBc2NpaSIsImJ1aWxkVGVybSIsImxpc3QiLCJPYmplY3QiLCJrZXlzIiwia2V5IiwicGFyYW1zIiwiZm9ybWF0RGF0ZSIsImRhdGUiLCJ0b1VUQ1N0cmluZyIsInJlcGxhY2UiLCJlc2NhcGVQYXJhbSIsInBhcmFtIiwicHJvdG90eXBlIiwidG9TdHJpbmciLCJjYWxsIiwiQXJyYXkiLCJpc0FycmF5IiwibWFwIiwidG9Mb3dlckNhc2UiLCJ1bnNoaWZ0IiwiYnVpbGRTVE9SRUNvbW1hbmQiLCJhY3Rpb24iLCJmbGFncyIsInNpbGVudCIsImZsYWciXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ08sU0FBU0EsaUJBQVQsQ0FBNEJDLFFBQTVCLEVBQXNDQyxLQUF0QyxFQUE2Q0MsT0FBN0MsRUFBc0Q7QUFDM0QsUUFBTUMsT0FBTyxHQUFHO0FBQ2RBLElBQUFBLE9BQU8sRUFBRUQsT0FBTyxDQUFDRSxLQUFSLEdBQWdCLFdBQWhCLEdBQThCLE9BRHpCO0FBRWRDLElBQUFBLFVBQVUsRUFBRSxDQUFDO0FBQ1hDLE1BQUFBLElB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QyxXQUFPO0FBQ0xoRCxNQUFBQSxJQUFJLEVBQUUsTUFERDtBQUVMQyxNQUFBQSxLQUFLLEVBQUUrQztBQUZGLEtBQVA7QUFJRCxHQUx1QixDQUF4QjtBQU9BLFNBQU9uRCxPQUFQO0FBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBwYXJzZXIgfSBmcm9tICdlbWFpbGpzLWltYXAtaGFuZGxlcidcbmltcG9ydCB7IGVuY29kZSB9IGZyb20gJ2VtYWlsanMtbWltZS1jb2RlYydcbmltcG9ydCB7IGVuY29kZSBhcyBlbmNvZGVCYXNlNjQgfSBmcm9tICdlbWFpbGpzLWJhc2U2NCdcbmltcG9ydCB7XG4gIGZyb21UeXBlZEFycmF5LFxuICB0b1R5cGVkQXJyYXlcbn0gZnJvbSAnLi9jb21tb24nXG5cbi8qKlxuICogQnVpbGRzIGEgRkVUQ0ggY29tbWFuZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzZXF1ZW5jZSBNZXNzYWdlIHJhbmdlIHNlbGVjdG9yXG4gKiBAcGFyYW0ge0FycmF5fSBpdGVtcyBMaXN0IG9mIGVsZW1lbnRzIHRvIGZldGNoIChlZy4gYFsndWlkJywgJ2VudmVsb3BlJ11gKS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gT3B0aW9uYWwgb3B0aW9ucyBvYmplY3QuIFVzZSBge2J5VWlkOnRydWV9YCBmb3IgYFVJRCBGRVRDSGBcbiAqIEByZXR1cm5zIHtPYmplY3R9IFN0cnVjdHVyZWQgSU1BUCBjb21tYW5kXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWlsZEZFVENIQ29tbWFuZCAoc2VxdWVuY2UsIGl0ZW1zLCBvcHRpb25zKSB7XG4gIGNvbnN0IGNvbW1hbmQgPSB7XG4gICAgY29tbWFuZDogb3B0aW9ucy5ieVVpZCA/ICdVSUQgRkVUQ0gnIDogJ0ZFVENIJyxcbiAgICBhdHRyaWJ1dGVzOiBbe1xuICAgICAgdHlwZTogJ1NFUVVFTkNFJyxcbiAgICAgIHZhbHVlOiBzZXF1ZW5jZVxuICAgIH1dXG4gIH1cblxuICBpZiAob3B0aW9ucy52YWx1ZUFzU3RyaW5nICE9PSB1bmRlZmluZWQpIHtcbiAgICBjb21tYW5kLnZhbHVlQXNTdHJpbmcgPSBvcHRpb25zLnZhbHVlQXNTdHJpbmdcbiAgfVxuXG4gIGxldCBxdWVyeSA9IFtdXG5cbiAgaXRlbXMuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgIGl0ZW0gPSBpdGVtLnRvVXBwZXJDYXNlKCkudHJpbSgpXG5cbiAgICBpZiAoL15cXHcrJC8udGVzdChpdGVtKSkge1xuICAgICAgLy8gYWxwaGFudW0gc3RyaW5ncyBjYW4gYmUgdXNlZCBkaXJlY3RseVxuICAgICAgcXVlcnkucHVzaCh7XG4gICAgICAgIHR5cGU6ICdBVE9NJyxcbiAgICAgICAgdmFsdWU6IGl0ZW1cbiAgICAgIH0pXG4gICAgfSBlbHNlIGlmIChpdGVtKSB7XG4gICAgICB0cnkge1xuICAgICAgICAvLyBwYXJzZSB0aGUgdmFsdWUgYXMgYSBmYWtlIGNvbW1hbmQsIHVzZSBvbmx5IHRoZSBhdHRyaWJ1dGVzIGJsb2NrXG4gICAgICAgIGNvbnN0IGNtZCA9IHBhcnNlcih0b1R5cGVkQXJyYXkoJyogWiAnICsgaXRlbSkpXG4gICAgICAgIHF1ZXJ5ID0gcXVlcnkuY29uY2F0KGNtZC5hdHRyaWJ1dGVzIHx8IFtdKVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyBpZiBwYXJzZSBmYWlsZWQsIHVzZSB0aGUgb3JpZ2luYWwgc3RyaW5nIGFzIG9uZSBlbnRpdHlcbiAgICAgICAgcXVlcnkucHVzaCh7XG4gICAgICAgICAgdHlwZTogJ0FUT00nLFxuICAgICAgICAgIHZhbHVlOiBpdGVtXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfVxuICB9KVxuXG4gIGlmIChxdWVyeS5sZW5ndGggPT09IDEpIHtcbiAgICBxdWVyeSA9IHF1ZXJ5LnBvcCgpXG4gIH1cblxuICBjb21tYW5kLmF0dHJpYnV0ZXMucHVzaChxdWVyeSlcblxuICBpZiAob3B0aW9ucy5jaGFuZ2VkU2luY2UpIHtcbiAgICBjb21tYW5kLmF0dHJpYnV0ZXMucHVzaChbe1xuICAgICAgdHlwZTogJ0FUT00nLFxuICAgICAgdmFsdWU6ICdDSEFOR0VEU0lOQ0UnXG4gICAgfSwge1xuICAgICAgdHlwZTogJ0FUT00nLFxuICAgICAgdmFsdWU6IG9wdGlvbnMuY2hhbmdlZFNpbmNlXG4gICAgfV0pXG4gIH1cblxuICByZXR1cm4gY29tbWFuZFxufVxuXG4vKipcbiAqIEJ1aWxkcyBhIGxvZ2luIHRva2VuIGZvciBYT0FVVEgyIGF1dGhlbnRpY2F0aW9uIGNvbW1hbmRcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXNlciBFLW1haWwgYWRkcmVzcyBvZiB0aGUgdXNlclxuICogQHBhcmFtIHtTdHJpbmd9IHRva2VuIFZhbGlkIGFjY2VzcyB0b2tlbiBmb3IgdGhlIHVzZXJcbiAqIEByZXR1cm4ge1N0cmluZ30gQmFzZTY0IGZvcm1hdHRlZCBsb2dpbiB0b2tlblxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRYT0F1dGgyVG9rZW4gKHVzZXIgPSAnJywgdG9rZW4pIHtcbiAgY29uc3QgYXV0aERhdGEgPSBbXG4gICAgYHVzZXI9JHt1c2VyfWAsXG4gICAgYGF1dGg9QmVhcmVyICR7dG9rZW59YCxcbiAgICAnJyxcbiAgICAnJ1xuICBdXG4gIHJldHVybiBlbmNvZGVCYXNlNjQoYXV0aERhdGEuam9pbignXFx4MDEnKSlcbn1cblxuLyoqXG4gKiBDb21waWxlcyBhIHNlYXJjaCBxdWVyeSBpbnRvIGFuIElNQVAgY29tbWFuZC4gUXVlcmllcyBhcmUgY29tcG9zZWQgYXMgb2JqZWN0c1xuICogd2hlcmUga2V5cyBhcmUgc2VhcmNoIHRlcm1zIGFuZCB2YWx1ZXMgYXJlIHRlcm0gYXJndW1lbnRzLiBPbmx5IHN0cmluZ3MsXG4gKiBudW1iZXJzIGFuZCBEYXRlcyBhcmUgdXNlZC4gSWYgdGhlIHZhbHVlIGlzIGFuIGFycmF5LCB0aGUgbWVtYmVycyBvZiBpdFxuICogYXJlIHByb2Nlc3NlZCBzZXBhcmF0ZWx5ICh1c2UgdGhpcyBmb3IgdGVybXMgdGhhdCByZXF1aXJlIG11bHRpcGxlIHBhcmFtcykuXG4gKiBJZiB0aGUgdmFsdWUgaXMgYSBEYXRlLCBpdCBpcyBjb252ZXJ0ZWQgdG8gdGhlIGZvcm0gb2YgXCIwMS1KYW4tMTk3MFwiLlxuICogU3VicXVlcmllcyAoT1IsIE5PVCkgYXJlIG1hZGUgdXAgb2Ygb2JqZWN0c1xuICpcbiAqICAgIHt1bnNlZW46IHRydWUsIGhlYWRlcjogW1wic3ViamVjdFwiLCBcImhlbGxvIHdvcmxkXCJdfTtcbiAqICAgIFNFQVJDSCBVTlNFRU4gSEVBREVSIFwic3ViamVjdFwiIFwiaGVsbG8gd29ybGRcIlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBxdWVyeSBTZWFyY2ggcXVlcnlcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gT3B0aW9uIG9iamVjdFxuICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5ieVVpZF0gSWYgdHVyZSwgdXNlIFVJRCBTRUFSQ0ggaW5zdGVhZCBvZiBTRUFSQ0hcbiAqIEByZXR1cm4ge09iamVjdH0gSU1BUCBjb21tYW5kIG9iamVjdFxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRTRUFSQ0hDb21tYW5kIChxdWVyeSA9IHt9LCBvcHRpb25zID0ge30pIHtcbiAgY29uc3QgY29tbWFuZCA9IHtcbiAgICBjb21tYW5kOiBvcHRpb25zLmJ5VWlkID8gJ1VJRCBTRUFSQ0gnIDogJ1NFQVJDSCdcbiAgfVxuXG4gIGxldCBpc0FzY2lpID0gdHJ1ZVxuXG4gIGNvbnN0IGJ1aWxkVGVybSA9IChxdWVyeSkgPT4ge1xuICAgIGxldCBsaXN0ID0gW11cblxuICAgIE9iamVjdC5rZXlzKHF1ZXJ5KS5mb3JFYWNoKChrZXkpID0+IHtcbiAgICAgIGxldCBwYXJhbXMgPSBbXVxuICAgICAgY29uc3QgZm9ybWF0RGF0ZSA9IChkYXRlKSA9PiBkYXRlLnRvVVRDU3RyaW5nKCkucmVwbGFjZSgvXlxcdyssIDA/KFxcZCspIChcXHcrKSAoXFxkKykuKi8sICckMS0kMi0kMycpXG4gICAgICBjb25zdCBlc2NhcGVQYXJhbSA9IChwYXJhbSkgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIHBhcmFtID09PSAnbnVtYmVyJykge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgIHZhbHVlOiBwYXJhbVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcGFyYW0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgaWYgKC9bXFx1MDA4MC1cXHVGRkZGXS8udGVzdChwYXJhbSkpIHtcbiAgICAgICAgICAgIGlzQXNjaWkgPSBmYWxzZVxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgdHlwZTogJ2xpdGVyYWwnLFxuICAgICAgICAgICAgICB2YWx1ZTogZnJvbVR5cGVkQXJyYXkoZW5jb2RlKHBhcmFtKSkgLy8gY2FzdCB1bmljb2RlIHN0cmluZyB0byBwc2V1ZG8tYmluYXJ5IGFzIGltYXAtaGFuZGxlciBjb21waWxlcyBzdHJpbmdzIGFzIG9jdGV0c1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICB2YWx1ZTogcGFyYW1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHBhcmFtKSA9PT0gJ1tvYmplY3QgRGF0ZV0nKSB7XG4gICAgICAgICAgLy8gUkZDIDM1MDEgYWxsb3dzIGZvciBkYXRlcyB0byBiZSBwbGFjZWQgaW5cbiAgICAgICAgICAvLyBkb3VibGUtcXVvdGVzIG9yIGxlZnQgd2l0aG91dCBxdW90ZXMuICBTb21lXG4gICAgICAgICAgLy8gc2VydmVycyAoWWFuZGV4KSwgZG8gbm90IGxpa2UgdGhlIGRvdWJsZSBxdW90ZXMsXG4gICAgICAgICAgLy8gc28gd2UgdHJlYXQgdGhlIGRhdGUgYXMgYW4gYXRvbS5cbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogJ2F0b20nLFxuICAgICAgICAgICAgdmFsdWU6IGZvcm1hdERhdGUocGFyYW0pXG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkocGFyYW0pKSB7XG4gICAgICAgICAgcmV0dXJuIHBhcmFtLm1hcChlc2NhcGVQYXJhbSlcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcGFyYW0gPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgcmV0dXJuIGJ1aWxkVGVybShwYXJhbSlcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBwYXJhbXMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdhdG9tJyxcbiAgICAgICAgdmFsdWU6IGtleS50b1VwcGVyQ2FzZSgpXG4gICAgICB9KTtcblxuICAgICAgW10uY29uY2F0KHF1ZXJ5W2tleV0gfHwgW10pLmZvckVhY2goKHBhcmFtKSA9PiB7XG4gICAgICAgIHN3aXRjaCAoa2V5LnRvTG93ZXJDYXNlKCkpIHtcbiAgICAgICAgICBjYXNlICd1aWQnOlxuICAgICAgICAgICAgcGFyYW0gPSB7XG4gICAgICAgICAgICAgIHR5cGU6ICdzZXF1ZW5jZScsXG4gICAgICAgICAgICAgIHZhbHVlOiBwYXJhbVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAvLyBUaGUgR21haWwgZXh0ZW5zaW9uIHZhbHVlcyBvZiBYLUdNLVRIUklEIGFuZFxuICAgICAgICAgIC8vIFgtR00tTVNHSUQgYXJlIGRlZmluZWQgdG8gYmUgdW5zaWduZWQgNjQtYml0IGludGVnZXJzXG4gICAgICAgICAgLy8gYW5kIHRoZXkgbXVzdCBub3QgYmUgcXVvdGVkIHN0cmluZ3Mgb3IgdGhlIHNlcnZlclxuICAgICAgICAgIC8vIHdpbGwgcmVwb3J0IGEgcGFyc2UgZXJyb3IuXG4gICAgICAgICAgY2FzZSAneC1nbS10aHJpZCc6XG4gICAgICAgICAgY2FzZSAneC1nbS1tc2dpZCc6XG4gICAgICAgICAgICBwYXJhbSA9IHtcbiAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgIHZhbHVlOiBwYXJhbVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcGFyYW0gPSBlc2NhcGVQYXJhbShwYXJhbSlcbiAgICAgICAgfVxuICAgICAgICBpZiAocGFyYW0pIHtcbiAgICAgICAgICBwYXJhbXMgPSBwYXJhbXMuY29uY2F0KHBhcmFtIHx8IFtdKVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgbGlzdCA9IGxpc3QuY29uY2F0KHBhcmFtcyB8fCBbXSlcbiAgICB9KVxuXG4gICAgcmV0dXJuIGxpc3RcbiAgfVxuXG4gIGNvbW1hbmQuYXR0cmlidXRlcyA9IGJ1aWxkVGVybShxdWVyeSlcblxuICAvLyBJZiBhbnkgc3RyaW5nIGlucHV0IGlzIHVzaW5nIDhiaXQgYnl0ZXMsIHByZXBlbmQgdGhlIG9wdGlvbmFsIENIQVJTRVQgYXJndW1lbnRcbiAgaWYgKCFpc0FzY2lpKSB7XG4gICAgY29tbWFuZC5hdHRyaWJ1dGVzLnVuc2hpZnQoe1xuICAgICAgdHlwZTogJ2F0b20nLFxuICAgICAgdmFsdWU6ICdVVEYtOCdcbiAgICB9KVxuICAgIGNvbW1hbmQuYXR0cmlidXRlcy51bnNoaWZ0KHtcbiAgICAgIHR5cGU6ICdhdG9tJyxcbiAgICAgIHZhbHVlOiAnQ0hBUlNFVCdcbiAgICB9KVxuICB9XG5cbiAgcmV0dXJuIGNvbW1hbmRcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGFuIElNQVAgU1RPUkUgY29tbWFuZCBmcm9tIHRoZSBzZWxlY3RlZCBhcmd1bWVudHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkU1RPUkVDb21tYW5kIChzZXF1ZW5jZSwgYWN0aW9uID0gJycsIGZsYWdzID0gW10sIG9wdGlvbnMgPSB7fSkge1xuICBjb25zdCBjb21tYW5kID0ge1xuICAgIGNvbW1hbmQ6IG9wdGlvbnMuYnlVaWQgPyAnVUlEIFNUT1JFJyA6ICdTVE9SRScsXG4gICAgYXR0cmlidXRlczogW3tcbiAgICAgIHR5cGU6ICdzZXF1ZW5jZScsXG4gICAgICB2YWx1ZTogc2VxdWVuY2VcbiAgICB9XVxuICB9XG5cbiAgY29tbWFuZC5hdHRyaWJ1dGVzLnB1c2goe1xuICAgIHR5cGU6ICdhdG9tJyxcbiAgICB2YWx1ZTogYWN0aW9uLnRvVXBwZXJDYXNlKCkgKyAob3B0aW9ucy5zaWxlbnQgPyAnLlNJTEVOVCcgOiAnJylcbiAgfSlcblxuICBjb21tYW5kLmF0dHJpYnV0ZXMucHVzaChmbGFncy5tYXAoKGZsYWcpID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgdHlwZTogJ2F0b20nLFxuICAgICAgdmFsdWU6IGZsYWdcbiAgICB9XG4gIH0pKVxuXG4gIHJldHVybiBjb21tYW5kXG59XG4iXX0=