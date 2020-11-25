/**
 * (c) Facebook, Inc. and its affiliates. Confidential and proprietary.
 */

//==============================================================================
// Welcome to scripting in Spark AR Studio! Helpful links:
//
// Scripting Basics - https://fb.me/spark-scripting-basics
// Reactive Programming - https://fb.me/spark-reactive-programming
// Scripting Object Reference - https://fb.me/spark-scripting-reference
// Changelogs - https://fb.me/spark-changelog
//
// For projects created with v87 onwards, JavaScript is always executed in strict mode.
//==============================================================================

/******* needed libraries ********/
const Scene = require("Scene");
const Reactive = require("Reactive");
export const Diagnostics = require("Diagnostics");
const Time = require("Time");
const Patches = require("Patches");
/******* define the variables ********/
let clawMoving = "clawMoving";
let clawCatching = "clawCatching";
let clawDragging = "clawDragging";
let clawFailing = "clawFailing";
let clawFinishing = "clawFinishing";
let restart = "restart";
let fixClawX = "fixClawX";
let fixClawZ = "fixClawZ";
let currentState = null;
let preState = null;

//variables for toys
let toys = [];
let targetToyNum = "targetToyNum";
let targetToy = null;
let originTargetToyY = 0;
let startClawHeight = 0;
let failToCatch = null;

//varibles for checking repeat type of accessory
let usedHead, usedEye, usedFace;
let preType = null;
let removeHead = "removeHead";
let removeFace = "removeFace";
let removeEye = "removeEye";


/******* find object from the scene ******/
let clawMachine;
Scene.root.findFirst("clawMachine").then((result)=>{
  clawMachine = result;
})
let moveStage;
Scene.root.findFirst("moveStage").then((result)=>{
  moveStage = result;
})
let claw;
Scene.root.findFirst("claw").then((result)=>{
  claw = result;
});



/******* function to set the stages ********/
function setPatchState(a, b, c, d, e) {
    Patches.inputs.setBoolean(clawMoving, a);
    Patches.inputs.setBoolean(clawCatching, b);
    Patches.inputs.setBoolean(clawDragging, c);
    Patches.inputs.setBoolean(clawFailing, d);
    Patches.inputs.setBoolean(clawFinishing, e);
  }


  function setToys() {
    for (let i = 0; i < 5; i++) {
      let name = "toy" + i;
      let toy;
      Scene.root.findFirst(name).then((t)=>{
        toy = t;
        if (i == 0 || i == 1) {
        toy.type = "head";
      } else if (i == 2) {
        toy.type = "face";
      } else if (i == 3 || i == 4) {
        toy.type = "eye";
      }
      toys.push(toy);
      })
    }
    usedEye = false;
    usedFace = false;
    usedHead = false;
    preType = null;
  }


  function checkCloseToy() {
    let minDis = 100;
    let moveStageX = moveStage.transform.x.pinLastValue();
    let moveStageZ = moveStage.transform.z.pinLastValue();
    let dis = 0;
    for (let i = 0; i < toys.length; i++) {
      let toyPosX = toys[i].transform.x.pinLastValue();
      let toyPosZ = toys[i].transform.z.pinLastValue();
      dis = Math.pow(moveStageX - toyPosX, 2) + Math.pow(moveStageZ - toyPosZ, 2); //Math.pow(clawPosY - toyPosY, 2);
      dis = Math.sqrt(dis);
      if (dis < minDis) {
        targetToy = i;
        minDis = dis;
      }
    }
    //judge if the closet toy is too far
    minDis < 0.08 && !toys[targetToy].hidden.pinLastValue()
      ? (failToCatch = false)
      : (failToCatch = true);
    Diagnostics.log(minDis + " " + failToCatch);
    if (!failToCatch) {
      toys[targetToy].transform.x = moveStageX;
      toys[targetToy].transform.z = moveStageZ;
      originTargetToyY = toys[targetToy].transform.y.pinLastValue();
      startClawHeight = claw.transform.y.pinLastValue();
      checkCaughtToy();
    }
  }

  function checkCaughtToy() {
    if (toys[targetToy].type == preType) {
      switch (toys[targetToy].type) {
        case "head":
          Patches.inputs.setBoolean(removeHead, true);
          break;
        case "face":
          Patches.inputs.setBoolean(removeFace, true);
          break;
        case "eye":
          Patches.inputs.setBoolean(removeEye, true);
          break;
      }
    } else if (toys[targetToy].type != preType) {
      switch (toys[targetToy].type) {
        case "head":
          if (usedHead) Patches.inputs.setBoolean(removeHead, true);
          break;
        case "face":
          if (usedFace) Patches.inputs.setBoolean(removeFace, true);
          break;
        case "eye":
          if (usedEye) Patches.inputs.setBoolean(removeEye, true);
          break;
      }
    }
    if (toys[targetToy].type == "head") usedHead = true;
    if (toys[targetToy].type == "eye") usedEye = true;
    if (toys[targetToy].type == "face") usedFace = true;
    preType = toys[targetToy].type;
  }

  function dragTargetToy() {
    Patches.inputs.setScalar(targetToyNum, targetToy);
    let deltaHeight = claw.transform.y.pinLastValue() - startClawHeight;
    toys[targetToy].transform.y = originTargetToyY + deltaHeight + 0.03;
  }


  function clawFinish() {
    setPatchState(false, false, false, false, true);
    preState = currentState;
  }


  function clawFailCatch() {
    setPatchState(false, false, false, true, false);
    Time.setTimeout(init, 2000);
  }



  /******* function to init the experience ********/
function init() {
    //shoot pulse when the experience restart
    Patches.inputs.setPulse(restart, Reactive.once());
    //set the active stage to clawMoving at the beginning 
    setPatchState(true, false, false, false, false);
    currentState = "moving";
    preState = currentState;
    //reset the claw postion to (0,0)
    Patches.inputs.setScalar(fixClawX, 0);
    Patches.inputs.setScalar(fixClawZ, 0);
    //set toy types
    setToys();
    //put the target toy back
    if (targetToy !== null && !failToCatch) {
    //hide last time target
    toys[targetToy].hidden = true;
    targetToy = null;
    }
    originTargetToyY = 0;
    startClawHeight = 0;
    Patches.inputs.setScalar(targetToyNum, 100);
    failToCatch = null;
    //reset these variables
    Patches.inputs.setBoolean(removeHead, false);
    Patches.inputs.setBoolean(removeFace, false);
    Patches.inputs.setBoolean(removeEye, false);
  }


//update the openMouth realtime from the patch//
let openMouth;
  Patches.outputs.getBoolean("catching").then((event) => {
    event.monitor().subscribe(function (values) {
      openMouth = values.newValue;
    });
  });
  
  //get the clawDrag signal from the patch//
  let clawDrag;
  Patches.outputs.getBoolean("dragging").then((event) => {
    event.monitor().subscribe(function (values) {
      clawDrag = values.newValue;
    });
  });

  //get the clawX and clawZ from the patch//
  let posX, posZ;
 Patches.outputs.getScalar("clawX").then((event)=>{
  event.monitor().subscribe(function (value) {
    posX = value.newValue;
  });
 });
 Patches.outputs.getScalar("clawZ").then((event)=>{
  event.monitor().subscribe(function (value) {
    posZ = value.newValue;
  });
 });


  //get the finishing signal from the patch
  let gameFinish;
  Patches.outputs.getBoolean("finishing").then((event) => {
    event.monitor().subscribe(function (values) {
      gameFinish = values.newValue;
    });
  });

  //get the tapScreen signal from the patch and detect if the game is finished
  Patches.outputs.getPulse("tapScreen").then((event) => {
    event.subscribe(() => {
      if (gameFinish) {
        init();
      }
    });
  });
  


  function update(){
    //check the state then switch to catching//
    if (openMouth && currentState === "moving") {
      setPatchState(false, true, false, false, false);
      currentState = "catching";
    }
    //lock the claw x and z position
    if (currentState === "catching" && preState === "moving") {
      // let posX = Patches.outputs.getScalar("clawX");
      // let posZ = Patches.outputs.getScalar("clawZ");
      preState = currentState;
      Patches.inputs.setScalar(fixClawX, posX);
      Patches.inputs.setScalar(fixClawZ, posZ);
    }
    //go to claw Drag stage
    if (clawDrag && currentState === "catching") {
      setPatchState(false, false, true, false, false);
      checkCloseToy();
      preState = currentState;
      currentState = "dragging";
    }
    //go to finishing state
    if (currentState === "dragging" && !failToCatch) {
      preState = currentState;
      currentState = "finishing";
    }
    //go to failing state
    if (currentState === "dragging" && failToCatch) {
      preState = currentState;
      currentState = "failing";
    }
    //drag the target toy 
    if (currentState === "finishing" && preState === "dragging") {
      Time.setTimeout(dragTargetToy, 2000);
      Time.setTimeout(clawFinish, 4000);
    }
  
    if (currentState === "failing" && preState === "dragging") {
      preState = currentState;
      Time.setTimeout(clawFailCatch, 4000);
    }

    Time.setTimeout(update, 50);
  }

  init()
  update()