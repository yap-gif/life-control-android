import test from "node:test";
import assert from "node:assert/strict";
import { queueStorageWrite } from "../bundle/storage-flow.js";

test("saving cannot report completion before Anna acknowledges storage.set", async () => {
  let acknowledge;
  let finished=false;
  const storage={set:()=>new Promise(resolve=>{acknowledge=resolve;})};
  const write=queueStorageWrite(Promise.resolve(),storage,"key",{savedPlan:{text:"plan"}});
  write.then(()=>{finished=true;});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(finished,false);
  acknowledge({etag:"success"});
  await write;
  assert.equal(finished,true);
});

test("two rapid saves are serialized and the newest snapshot wins",async()=>{
  const order=[];
  let completeFirst;
  const storage={
    set:({value})=>{
      order.push(value.sequence);
      if(value.sequence===1)return new Promise(resolve=>{completeFirst=resolve;});
      return Promise.resolve({etag:"second"});
    }
  };
  const first=queueStorageWrite(Promise.resolve(),storage,"key",{sequence:1});
  const second=queueStorageWrite(first,storage,"key",{sequence:2});
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(order,[1],"Second write must not overtake first");
  completeFirst({etag:"first"});
  await Promise.all([first,second]);
  assert.deepEqual(order,[1,2]);
});

test("a failed write is not acknowledged; later queue writes can still proceed",async()=>{
  let attempts=0;
  const storage={set:()=>++attempts===1 ? Promise.reject(new Error("host storage error")):Promise.resolve({etag:"retry"})};
  const first=queueStorageWrite(Promise.resolve(),storage,"key",{sequence:1});
  await assert.rejects(first,/host storage error/);
  const retry=queueStorageWrite(first,storage,"key",{sequence:2});
  assert.deepEqual(await retry,{etag:"retry"});
  assert.equal(attempts,2);
});

test("storage failure is explicit when runtime is disconnected",async()=>{
  await assert.rejects(queueStorageWrite(Promise.resolve(),null,"key",{}),/not connected/);
});
