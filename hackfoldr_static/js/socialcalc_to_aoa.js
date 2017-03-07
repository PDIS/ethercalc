// (c) Copyright 2008, 2009, 2010 Socialtext, Inc.
// All Rights Reserved.
//
// The contents of this file are subject to the Artistic License 2.0; you may not
// use this file except in compliance with the License. You may obtain a copy of
// the License at http://socialcalc.org/licenses/al-20/.
//
// Some of the other files in the SocialCalc package are licensed under
// different licenses. Please note the licenses of the modules you use.

function SpreadsheetControlDecodeSpreadsheetSave (spreadsheet, str) {
   var pos1, mpregex, searchinfo, boundary, boundaryregex, blanklineregex, start, ending, lines, i, lines, p, pnun;
   var parts = {};
   var partlist = [];

   pos1 = str.search(/^MIME-Version:\s1\.0/mi);
   if (pos1 < 0) return parts;

   mpregex = /^Content-Type:\s*multipart\/mixed;\s*boundary=(\S+)/mig;
   mpregex.lastIndex = pos1;

   searchinfo = mpregex.exec(str);
   if (mpregex.lastIndex <= 0) return parts;
   boundary = searchinfo[1];

   boundaryregex = new RegExp("^--"+boundary+"(?:\r\n|\n)", "mg");
   boundaryregex.lastIndex = mpregex.lastIndex;

   searchinfo = boundaryregex.exec(str); // find header top boundary
   blanklineregex = /(?:\r\n|\n)(?:\r\n|\n)/gm;
   blanklineregex.lastIndex = boundaryregex.lastIndex;
   searchinfo = blanklineregex.exec(str); // skip to after blank line
   if (!searchinfo) return parts;
   start = blanklineregex.lastIndex;
   boundaryregex.lastIndex = start;
   searchinfo = boundaryregex.exec(str); // find end of header
   if (!searchinfo) return parts;
   ending = searchinfo.index;

   lines = str.substring(start, ending).split(/\r\n|\n/); // get header as lines
   for (i=0;i<lines.length;i++) {
      line=lines[i];
      p = line.split(":");
      switch (p[0]) {
         case "version":
            break;
         case "part":
            partlist.push(p[1]);
            break;
         }
      }

   for (pnum=0; pnum<partlist.length; pnum++) { // get each part
      blanklineregex.lastIndex = ending;
      searchinfo = blanklineregex.exec(str); // find blank line ending mime-part header
      if (!searchinfo) return parts;
      start = blanklineregex.lastIndex;
      if (pnum==partlist.length-1) { // last one has different boundary
         boundaryregex = new RegExp("^--"+boundary+"--$", "mg");
         }
      boundaryregex.lastIndex = start;
      searchinfo = boundaryregex.exec(str); // find ending boundary
      if (!searchinfo) return parts;
      ending = searchinfo.index;
      parts[partlist[pnum]] = {start: start, end: ending}; // return position within full string
      }

   return parts;

}

/* 
Copyright (C) 2014-present  SheetJS

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
function socialcalc_to_aoa(str, opts) {
  var records = str.split('\n'), R = -1, C = -1, ri = 0, arr = [];
  for (; ri !== records.length; ++ri) {
    var record = records[ri].trim().split(":");
    if(record[0] !== 'cell') continue;
    var addr = decode_cell(record[1]);
    if(arr.length <= addr.r) for(R = arr.length; R <= addr.r; ++R) if(!arr[R]) arr[R] = [];
    R = addr.r; C = addr.c;
    switch(record[2]) {
      case 't': arr[R][C] = scdecode(record[3]); break;
      case 'v': arr[R][C] = +record[3]; break;
      case 'vtc': case 'vtf':
        switch(record[3]) {
          case 'nl': arr[R][C] = +record[4] ? true : false; break;
          default: arr[R][C] = +record[4]; break;
        } break;
    }
  }
  return arr;
}

function scdecode(s) {
  return s.replace(/\\b/g, "\\").replace(/\\c/g, ":").replace(/\\n/g,"\n");
}

function decode_cell(cstr) { var splt = split_cell(cstr); return ({ c:decode_col(splt[0]), r:decode_row(splt[1]) }); }
function split_cell(cstr) { return cstr.replace(/(\$?[A-Z]*)(\$?\d*)/,"$1,$2").split(","); }
function decode_col(colstr) { var c = unfix_col(colstr), d = 0, i = 0; for(; i !== c.length; ++i) d = 26*d + c.charCodeAt(i) - 64; return d - 1; }
function unfix_col(cstr) { return cstr.replace(/^\$([A-Z])/,"$1"); }
function decode_row(rowstr) { return parseInt(unfix_row(rowstr),10) - 1; }
function unfix_row(cstr) { return cstr.replace(/\$(\d+)$/,"$1"); }
