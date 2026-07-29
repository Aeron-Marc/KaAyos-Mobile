#!/bin/bash
# Remove API key from server.ts
if [ -f server.ts ]; then
  sed 's/sk-or-v1-[a-zA-Z0-9]\{56\}//g' server.ts > server.ts.tmp
  mv server.ts.tmp server.ts
fi
