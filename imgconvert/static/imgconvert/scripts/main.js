// imports
const Globals = require('./globals.js');
const UploadedImage = require('./UploadedImage.js');
const ConvertPhoto = require('./ConvertPhoto.js');
const AutoFace = require('./AutoFace.js');

// 3rd party imports
// import Cropper from 'cropperjs';
// const RgbQuant = require('rgbquant');

(function( window ) {'use strict';
  // get window objects
  // 3rd party
  const Cropper = window.Cropper;
  const Caman = window.Caman;

  // gets the color data passed to the template
  (()=>{
    console.log('getting color palette');
    // handle color choices from the template
    const jsonValueID = 'colorData';
    try {
      const cd = JSON.parse(document.getElementById(jsonValueID).textContent);
      Globals.colorData = cd; // set globals object of palette choices
      Globals.color = 'CL'; // should eventually get this value from the views template defaults value
      Globals.resetPalette(); // initialize some globals objects
      displayPalette(); // populate the dom with the palette buttons
    }
    catch(e) {console.warn(e)}

    // initialize the bg pattern / any other globals defaults here, get the defaults from django views
    Globals.bgPattern = 'solid';

  })();

  // cropper variables
  var URL = window.URL || window.webkitURL,                               // for ie
      CONTAINER_UPLOADED = document.getElementById('containerUploaded'),  // uploaded image container
      IMG_EL = document.getElementById('imgUploaded'),                    // the HTMLImageELement for the uploaded image
      CONTAINER_RESULT = document.getElementById('containerResult'),      // parent of mosaic display
      PREVIEW_RESULT = document.getElementById('previewResult'),          // preview container
      SLIDER_CROPPED = document.getElementById('previewSliderResult'),    // preview the cropped non-tiled section w/ slider tweaks
      /**
       * main function to convert cropped section into a mosiac and display that mosaic to the dom
       * @param  {[object]} options [options for cropper canvas, may not be used always, created for development]
       * @return {[undefined]}      [doesn't return anything]
       */
      DISPLAY_MOSAICS = function (options) {
        // should be called when new pixels in crop box area and the mosaic display needs refreshed
        console.log(options);
        console.log('--- display mosaics called ---');

        // first call to conversion is for the preview beside the upload image, this mosaic should be filter free
        console.log('- converting for sample default preview -');
        // display raw preview
        // uses default cropper canvas options to optain a canvas
        canvasPreview({
          targetElement: PREVIEW_RESULT,
          tileSize: Math.max( 1, Math.floor(PREVIEW_RESULT.clientWidth/Globals.x) ),
          saveCanvas: false,
        });


        // second call to conversion for a larger preview that can be altered
        console.log('- converting for main mosaic container -');
        // display main alterable mosaic
        // CONTAINER_RESULT.innerHTML = '';
        let defaults = {
          // tileSize: Math.max( 1, Math.floor(CONTAINER_RESULT.clientWidth/Globals.x) ),
          tileSize: 8,
          saveCanvas: true,
        };

        canvasPreview(defaults);


        // there are no more changes so no need to save again.
        SAVE_MOSAIC.disabled = false;
      },
      /**
       * a default ready callback for the cropper ready event
       * @param  {[event]} e [croppers custom event]
       */
      DEFAULT_READY = function(e){
        console.log('%c'+e.type,'color:green;');
        console.log('default ready');
        let str = 'from default ready';
        DISPLAY_MOSAICS(str);
        // UploadedImage.callOnCrop = true;

      },
      // options for the cropper object
      // check the docs for clarification on these
      CROPPER_OPTIONS = {
        aspectRatio: Globals.aspectRatio,
        viewMode: 2,
        ready: DEFAULT_READY,
        autoCrop: false,
        autoCropArea: .01,
        zoomOnWheel: false,
        zoomOnTouch: false,
        // cropper events
        cropstart: function (e) {
          console.log('%c'+e.type,'color:green;');
          console.log('%c'+e.detail.action,'color:green;');
        },
        cropmove: function (e) {
          console.log('%c'+e.type,'color:orange;');
          console.log('%c'+e.detail.action,'color:orange;');
        },
        cropend: function (e) {
          console.log('%c'+e.type,'color:red;');
          console.log('%c'+e.detail.action,'color:red;');
          let str = 'from cropend';
          DISPLAY_MOSAICS(str);
        },
        crop: function (e) {
          console.log('%c'+e.type,'color:blue;');

          // bool so that if a chain of cropper methods are called the mosaic will only be updated once
          if(UploadedImage.callOnCrop){
            let str = 'from crop';
            DISPLAY_MOSAICS(str);
          }

          UploadedImage.callOnCrop = true;
        },
        zoom: function (e) {
          console.log('%c'+e.type,'color:purple;');
        }
      },
      // keep track of image upload object values
      CROPPER; // the cropper instance
      const IMAGE_INPUT = document.getElementById('importImage'); // the input for the uploaded photot


  /**
   * a function to call cropper's getCroppedCanvas inchludes some default options
   * cropper docs reccomend a max width and height value so a canvas is never returned blank if region is too large
   * setting these values causes a rotated image to return with incorrect bounds, making the result different from the crop box region
   * @param  {[object]} options [cropper getCroppedCanvas options]
   * @return {[HTMLCanvasElement]}  [returns the cropped region of the uploaded image as visialized by cropper's cropbox as a canvas element]
   */
  function getCropperCanvas(options){
    // setting the max values like this causes problems, leaving it commented out for now
    // get a canvas of the region outlined by the cropbox
    // set maxWidth to not exceed the naturalWidth
    let boxD = CROPPER.getCropBoxData();
    // let maxWidth = boxD.width * UploadedImage.scaleFactor;
    // let maxHeight = boxD.height * UploadedImage.scaleFactor;

    let useOptions = (options && typeof options == 'object') ? true : false;
    console.log('---------------- cropper canvas extract ----------------------');
    // console.log(`use passed options for cropper? ${useOptions}`);

    let defaults = {
      width: boxD.width,
      height: boxD.height,
      minWidth: Globals.x,
      minHeight: Globals.y,
      // maxWidth: maxWidth,
      // maxHeight: maxHeight,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high', // one of ['low', 'medium', 'high']
      // maxWidth: 4096,
      // maxHeight: 4096,
    };
    let ops = defaults;

    if(useOptions) { ops = Object.assign({}, defaults, options); }
    return CROPPER.getCroppedCanvas(ops);
  }




  // get options to sent to convert photo
  // kinda a options dictionary builder for the conversion to tiled mosaic
  function canvasPreview(options){
    console.log(' --- canvas preview --- ');
    // const previewWidth = Globals.x * Globals.tileSize;
    // const previewHeight = Globals.y * Globals.tileSize;
    let useOptions = (options && typeof options == 'object') ? true : false;
    console.log('use canvas preview passed options ? ' + useOptions);

    // set up the options to be passed to conversion
    let defaults = {
      // where the mosoic is loaded should stay constant
      targetElement: CONTAINER_RESULT,
      // the ontly readon this should change is on responsive window resize
      tileSize: Globals.tileSize,
    };
    let updateEveryCall = {
      colorChoice: Globals.color,       // the key name for the palette a string
      palette: Globals.palette,         // list of the color palette
      tilesX: Globals.x,                // number of tiles in the x axis
      tilesY: Globals.y,                // number of tiles in the y axis
      // values below are only used if defaults useBG is true (remove bg is checked)
      // whether or not to use the bg pattern
      useBG: Globals.useBG,
      fillColorList: Globals.bgColors,  // list of colors to use in the bg
      fillPattern: Globals.bgPattern,      // string of the bg pattern type
    };
    let ops;
    if(useOptions){ ops = Object.assign({}, defaults, options, updateEveryCall); }
    else { ops = Object.assign({}, defaults, updateEveryCall); }
    if(!ops.hasOwnProperty('canvas')){
      console.log('getting default canvas');
      ops.canvas = getCropperCanvas();
    }

    // store options for this image, preview does not get saved
    if(useOptions && options.saveCanvas){
      UploadedImage.moasicOptions = Object.assign({}, ops);
    }

    // if filters have been applied, gotta apply them for this canvas
    // only apply filters to the result mosaic, not the preview
    if(ops.targetElement == CONTAINER_RESULT && ( UploadedImage.applyFilters || UploadedImage.usePreset ) ){
      // called from updating the cropper box and not from filter adjust
      // gotta apply existing stored filters
      if(!options.hasOwnProperty('filterCanvas')){
        // regenerate canvas form new cropbox view, so canvas is null
        applyFilters(function(resp){
          let ops = Object.assign({}, UploadedImage.moasicOptions, {canvas: resp} );
          callConversion(ops);
          // for dev see what the non-tiled canvas image looks like with the filters
          SLIDER_CROPPED.innerHTML = '';
          SLIDER_CROPPED.appendChild(resp);
        });
        return;
      }
      // called with a filter canvas object passed, so was called from the filter listener
      ops.canvas = ops.filterCanvas;
    }

    callConversion(ops);
  } // end preview canvas

  function callConversion(ops){
    // holdover from testing different tiling methods, might still use it so keep the format
    let method = 'createTiles';
    if( ops.hasOwnProperty('methodname') ){ method = ops.methodname; }

    // create the mosaic instance
    let convertPhoto = new ConvertPhoto(ops);
    // call for the tiler
    let mosaic = convertPhoto[method]();

    // clear the copied filtered canvas from storage
    if(UploadedImage.moasicOptions && UploadedImage.moasicOptions.hasOwnProperty('filterCanvas')){
      delete UploadedImage.moasicOptions.filterCanvas;
    }
    // add to dom
    console.log(`updating container: ${ops.targetElement.id}`);
    ops.targetElement.innerHTML = '';
    ops.targetElement.appendChild(mosaic);
  }

  // setups the color palette buttons in the dom
  function displayPalette(){
    // get bg palette container
    let bgPalette = document.getElementById('bgPalette');
    let bgColors = [];
    // loop through every palette available
    for(let[key, palette] of Object.entries(Globals.colorData)){
      // the display container for each palette
      let parent = document.getElementById(key);
      parent.innerHTML = '';
      // put all colors in container
      let paletteContainer = document.createElement('div');
      paletteContainer.classList.add('row');
      paletteContainer.classList.add('palette-container');


      // get visuals of currently active palette set up
      if(Globals.color == key) {
        let pBtn = document.getElementById(key+'-tab');
        parent.classList.add('show');
        parent.classList.add('active');
        pBtn.classList.add('active');
      }

      // populate each dropdown with appropriate colors
      for(let i=0; i<palette.length; i++){
        let el = document.createElement('button');
        let rgb = Object.values(palette[i]).join(',');
        // store color on element
        el.setAttribute('data-rgb', rgb);
        el.setAttribute('data-main', 'palette');
        el.type = 'button';
        el.classList.add('m-2');
        el.classList.add('btn');
        el.classList.add('btn-palette-color');
        el.style.backgroundColor = 'rgba('+rgb+',1)';

        // bg buttons use every color available, don't make duplicates
        if(!bgColors.includes(rgb)) {
          let bgEL = el.cloneNode();
          bgEL.setAttribute('data-method', 'bgColors');
          if(rgb === '255,255,255'){
            bgEL.classList.add('active');
            // keep track of selected color order
            Globals.bgColors = [rgb];
          }
          bgPalette.appendChild(bgEL);
          bgColors.push(rgb);
        }

        el.setAttribute('data-method', 'palette');
        el.classList.add('active');
        paletteContainer.appendChild(el);
      }

      parent.appendChild(paletteContainer);

    }
  } // end display palette

  function appendCropperImageToDOM(typeSTR){
    // three scenarios
    // 1. new upload = destry cropper and instance a new one
    // 2. call CROPPER.replace anyway even though the images are different sizes
    // 3. manually adjust cropper transformations and upload new img element and new cropper instance
    console.log('appending to dom');
    const suffix = '_uploadedImageURL';
    const urlkey = typeSTR + suffix;
    let src = UploadedImage[ urlkey ];
    console.log('image source is');
    console.log(src);

    // get transformations of curent image to apply to the impending image if swapping
    if(CROPPER && CROPPER.cropped){
      console.log('%c--------------------------','color:red;');
      console.log('switching image');

      CROPPER.replace(src, false);

      // cropper ready should be the same for both images for a switch out
      CROPPER.options.ready = function(e) {
        console.log('%c'+e.type,'color:green;');
        console.log('ready has been reset after replace');

        // set values of transforms for this image session

        // rotate
        UploadedImage.callOnCrop = false;
        CROPPER.rotateTo(UploadedImage.storedCropperData.naturalData.rotate);

        UploadedImage.callOnCrop = false;
        CROPPER.setCanvasData({
          left: UploadedImage.storedCropperData.wrapperData.left,
          top: UploadedImage.storedCropperData.wrapperData.top,
          width: UploadedImage.storedCropperData.wrapperData.width,
          height: UploadedImage.storedCropperData.wrapperData.height,
        });

        // the cropbox
        UploadedImage.callOnCrop = false;
        CROPPER.clear();
        UploadedImage.callOnCrop = false;
        CROPPER.crop();
        // UploadedImage.callOnCrop = false;
        CROPPER.setCropBoxData(UploadedImage.storedCropperData.boxData);


        // DISPLAY_MOSAICS('from removebg ready');
      };


    }
    // a new image upload, no need to copy over anyt transformations
    else if(typeSTR == 'original') {
      console.log('new upload');

      // clear dom and append new img if swapping
      // CONTAINER_UPLOADED.innerHTML = '';
      // CONTAINER_UPLOADED.appendChild(el);

      CROPPER_OPTIONS.ready = function(e){
        console.log('%c'+e.type,'color:green;');
        console.log(this.cropper);
        console.log('upload ready');
        getImageForAutoFace();
        // no longer using autocrop, might not need the callOnCrop bool
        // UploadedImage.callOnCrop = true;
      };
      // create new cropper instance for new upload
      console.log('aspect ratio is');
      console.log(CROPPER_OPTIONS.aspectRatio);
      CROPPER = new Cropper(IMG_EL, CROPPER_OPTIONS);
    }


    // for dev to see the filtered iamge preview
    SLIDER_CROPPED.innerHTML = '';
    document.getElementById('devImageResult').innerHTML = '';

  }

  // listener for user uploaded image
  if (URL) {
    IMAGE_INPUT.onchange = function () {
      let files = this.files;
      let file;

      // make sure a file was uploaded
      if (files && files.length) {
        file = files[0];

        // make sure it's an image file
        if (/^image\/\w+/.test(file.type)) {
          // save file to image object
          UploadedImage.file = file;
          // revoke previous image and removedbg image if exists on each new image uploiad
          if (UploadedImage.original_uploadedImageURL) {
            URL.revokeObjectURL(UploadedImage.original_uploadedImageURL);
            // revoke if exists the remove background image
            if (UploadedImage.removebg_uploadedImageURL) {
              URL.revokeObjectURL(UploadedImage.removebg_uploadedImageURL);
              UploadedImage.removebg_uploadedImageURL = null;
            }
          }

          // create new object url for this upload
          UploadedImage.original_uploadedImageURL = URL.createObjectURL(file);
          // for using CROPPER.replace();
          IMG_EL.src = UploadedImage.original_uploadedImageURL;

          // for when nobg and original are two different img el's that get swapped
          // let originalImg = document.createElement('img');
          // originalImg.src = UploadedImage.original_uploadedImageURL;
          // UploadedImage.original = originalImg;

          // clear local stored mosaic adjustment values
          UploadedImage.startFresh();

          // clear previous cropper instance if exists
          if( CROPPER && CROPPER.cropped ){ CROPPER.destroy(); }
          // a new upload so type is original
          appendCropperImageToDOM('original');

          // reset background
          resetRemoveBG( false );

          // clear file upload input for next upload
          IMAGE_INPUT.value = null;

        } else {
          window.alert('Please choose an image file.');
        }
      }
    };
  } else {
    IMAGE_INPUT.disabled = true;
    IMAGE_INPUT.parentNode.className += ' disabled';
  }


  function getdisplayCrop(){
    // wrapper -
    let wrapper = CROPPER.getCanvasData();
    // console.log('%c wrapper', 'color:orange;');
    // console.table(wrapper);
    // let imgData = CROPPER.getImageData();
    // console.log('%c img data', 'color:orange;');
    // console.table(imgData);
    // store current data
    let stored = CROPPER.getData();
    // console.log('%c Data', 'color:orange;');
    // console.table(stored);
    //
    // container - the div that the image is uploaded to, overflow is set to hidden
    let cd = CROPPER.getContainerData();
    // console.log('%c container data', 'color:orange;');
    // console.table(cd);
    let fullCrop = {};


    // get the full visible area of the image as a cropped region
    // find out if the right side of the image is out of bounds
    let wrapperWidth = wrapper.width + wrapper.left;
    if (wrapper.left < 0){

      // left side of image out of bounds, set to 0
      fullCrop.left = 0;

      // if the right side of the image is out of bounds, use the display end point : else img is within bounds keep same value
      fullCrop.width = ( wrapperWidth > cd.width ) ? cd.width : wrapperWidth;
    }
    else {
      // left side of image is within bounds keep the left value the same
      fullCrop.left = wrapper.left;

      // if the right side of the image is out of bounds, calculate the distance to the display end point : else img is within bounds keep same value
      fullCrop.width = ( wrapperWidth > cd.width ) ? (cd.width - fullCrop.left) : wrapper.width;
    }

    // find out if the bottom of the image is out of bounds
    let wrapperHeight = wrapper.height + wrapper.top;
    if ( wrapper.top < 0 ){
      fullCrop.top = 0;
      fullCrop.height = ( wrapperHeight > cd.height ) ? cd.height : wrapperHeight;
    }
    else {
      fullCrop.top = wrapper.top;
      fullCrop.height = ( wrapperHeight > cd.height ) ? (cd.height - wrapper.top) : wrapper.height;
    }


    // console.log(`width: ${width}, height: ${height}`);
    // set triggers crop event which converts crop area to mosaic, which is unwanted right now
    UploadedImage.callOnCrop = false;
    // change the aspect ratio to get the full display image
    CROPPER.setAspectRatio(fullCrop.width/fullCrop.height);

    // set triggers crop event which converts crop area to mosaic, which is unwanted right now
    UploadedImage.callOnCrop = false;
    // get the canvas of the entire displayed area
    let getFull = CROPPER.setCropBoxData(fullCrop);

    let defaults = {
      width: fullCrop.width,
      height: fullCrop.height,
      // maxWidth: fullCrop.width,
      // maxHeight: fullCrop.height,
      // minWidth: fullCrop.width,
      // minHeight: fullCrop.height,
    };


    // for some reason the above options clip the alpha space out of the returned canvas, seding over the incorrect image to autoface
    // use this if rotated
    // let ar = (fullCrop.width / fullCrop.height);
    // let rotate = {
    //   width: fullCrop.width,
    //   height: fullCrop.height,
      // maxWidth: 4096,
      // maxHeight: 4096 / ar,
      // minWidth: ar,
      // minHeight: 1,
    // };

    // let ops = stored.rotate != 0 ? rotate : defaults;
    let ops = defaults;
    // console.log((stored.rotate != 0) + ' - ' + typeof stored.rotate);
    console.table(ops);

    // get the canvas
    let canvas = CROPPER.getCroppedCanvas(ops);


    // test if left top 0 aligns with the container or the wrapper
    // return canvas;

    // set triggers crop event which converts crop area to mosaic, which is unwanted right now
    UploadedImage.callOnCrop = false;
    // restore aspect ratio
    CROPPER.setAspectRatio(Globals.aspectRatio);

    // set triggers crop event which converts crop area to mosaic, which is unwanted right now
    UploadedImage.callOnCrop = false;
    // restore data
    CROPPER.setData(stored);

    return {
      canvas: canvas,
      top: fullCrop.top,
      left: fullCrop.left,
    };
  }

  function devDisplaySentToAutoFace(image, str, clear){
    console.log(str);
    let container = document.getElementById('devImageResult');
    if(clear){ container.innerHTML = ''; }
    container.appendChild(image);
  }


  // gets a snap of the whole display area in case of image transformations,
  // this sends the transformed image to autoface, instead of the default uploaded image
  function getImageForAutoFace(options) {

    if(CROPPER && !CROPPER.cropped){ CROPPER.crop(); }
      // get snap of entire visible image in the display
      let results = getdisplayCrop();
      let canvas = results.canvas;
      canvas.toBlob(function(blob) {
        let url = URL.createObjectURL(blob);
        let newImg = document.createElement('img');
        newImg.src = url;
        // for dev, display the image that was sent to confirm the section was grabbed correctly
        devDisplaySentToAutoFace(newImg, 'called from getImageForAutoFace', true);

        newImg.onload = function() {
          // return;
          // send transformed display to autoface to find face
          useAutoFace({
            image: newImg,
            useOriginal:false,
            displaySize: {
              width: canvas.width,
              height: canvas.height,
              top: results.top,
              left: results.left,
            },
          });

          // no longer need to read the blob so it's revoked
          URL.revokeObjectURL(url);
        };

      });

  }

  function useAutoFace(options){
    console.log('calling autoface');
    // TODO: set up a loading overlay to give auto detect faces time to return

    // get the auto crop bound if there are faces
    let defaults = {
      image: UploadedImage.file,
      aspectRatio: Globals.aspectRatio,
      useOriginal: true,
    };
    let ops = defaults;
    if( options && typeof options == "object"){ ops = Object.assign({}, defaults, options); }

    console.log(ops.image);

    // for dev display image that was sent to autoface to confirm it is correct
    devDisplaySentToAutoFace(ops.image, 'called from AutoFace promise return', false);

    // get the bounds of the faceapi calculated to the passed aspect ratio
    new AutoFace(ops).results
      .then(resp => {
        console.log('-- autoface promise returned ---');
        if(resp) {

          if(ops.useOriginal){
            console.log('using set data');
            CROPPER.setData(resp); // triggers cropper options crop event
          }
          else{
            console.log('setting just the crop box in relation to display');
            CROPPER.setCropBoxData(resp); // triggers cropper options crop event
          }

          // if the crop event does not call display mosaics, call it here
          // let str = 'from autoface promise return';
          // DISPLAY_MOSAICS(str);
        }
        else {  // face api found no faces handle this
          console.warn('face api returned some falsey value');
        }

      })
      .catch(err=>{console.warn(err)});
  }

  function resetRemoveBG(checked) {
    let box = document.getElementById('useRemoveBG');
    if (box.checked != checked){box.checked = checked;}
    let btn = document.getElementById('removeBG');
    let btnSelector = btn.getAttribute('data-target');

    let classname = 'show';
    let btnTarget = document.querySelector(btnSelector);


    // have check enable / disable button
    btn.disabled = !checked;

    // close dropdown if open and use removed bg is no longer selected
    if(!checked && btnTarget.classList.contains(classname) ){ $(btnSelector).collapse('hide'); }
  }

  // call for remove background / handle background tools display
  document.getElementById('useRemoveBG').onchange = function(){
    let typeSTR = this.checked ? 'removebg' : 'original';
    console.log('remove bg clicked, state is ' + typeSTR);

    let calledRemovebg = false;

    // indicate if pattern will be sent to convert photo
    Globals.useBG = this.checked;

    // for when the nobg and original were two separate img elements
    // still need it for replace?
    if(CROPPER && CROPPER.cropped){
      // store current data for restoring crop box to the same spot
      // has to keep all transforms from original background to remove background

      UploadedImage.storedCropperData = {
        naturalData: CROPPER.getData(),           // the cropbox position / other data in relation to original image size
        wrapperData: CROPPER.getCanvasData(),     // the image wrapper - holds all transform data in relation to the container / display image
        boxData: CROPPER.getCropBoxData(),       // the cropbox position in relation to the container parent display div
        // imgData: CROPPER.getImageData(),         // uploaded image data - still unsure of how to use
        // containerData: CROPPER.getContainerData(),   // the block element parent container to the image
      };

    }

    if(this.checked){
      // checked if called remove bg yet
      if( UploadedImage.removebgApiStatus === UploadedImage.statusList.ready ){
        // make request to removebg API
        UploadedImage.removebgApiStatus = UploadedImage.statusList.pending;
        uploadForRemoveBG()
        .catch(e=>{
          UploadedImage.removebgApiStatus = UploadedImage.statusList.error;
          console.warn(e);
        });
        calledRemovebg = true;
      }
    }

    resetRemoveBG(this.checked);

    if( !calledRemovebg ){ appendCropperImageToDOM(typeSTR); }
  }

  async function uploadForRemoveBG(){

    let url = 'removebg/';
    const csrftoken = getCookie('csrftoken');
    let headers = {
      'X-CSRFToken': csrftoken,
      'Accept': '*/*',
    }

    const imageField = UploadedImage.file;
    if(!imageField){  throw new Error('no uploaded image found'); }
    let formData = new FormData();
    formData.append("image_file", imageField);

    await fetch(url, {
        method: 'POST',
        body: formData,
        headers: headers,
    })
    .then(resp => {
      // resp is a readable stream
      const reader = resp.body.getReader();
      return new ReadableStream({
        start(controller) {
          return pump();
          function pump() {
            return reader.read().then(({ done, value }) => {
              // When no more data needs to be consumed, close the stream
              if (done) {
                  controller.close();
                  return;
              }
              // Enqueue the next data chunk into our target stream
              controller.enqueue(value);
              return pump();
            });
          } // end pump
        } // end start
      });
    })
    // Create a new response out of the stream
    .then(rs => new Response(rs))
    // Create an object URL for the response
    .then(response => response.blob())
    // save the created url to be revoked upon new upload of image
    .then(blob => {
      UploadedImage.removebg_uploadedImageURL = URL.createObjectURL(blob);

      // for when nobg and original are two separate elemts to be swapped into the cropper
      // let nobgImg = document.createElement('img');
      // nobgImg.src = UploadedImage.removebg_uploadedImageURL;
      // UploadedImage.removebg = nobgImg;

      // call apply to dom
      appendCropperImageToDOM('removebg');
      UploadedImage.removebgApiStatus = UploadedImage.statusList.success;
    });
    // .catch(console.error);
  }

  // container for sliders input
  // document.getElementById('slidersContent').onchange = handleClicks;
  // container for the cropper tools
  document.getElementById('cropToolbar').onclick = handleClicks;
  // container for mosaic tool controls
  document.getElementById('toolsDropdown').onclick = handleClicks;
  function handleClicks(e){
    // add some checks here to make sure the event target is got on all browsers
    let target = e.target;
    let etype = e.type;
    console.log('the target is');
    console.log(target);
    // let updateCropper = this.id === 'cropToolbar';
    // console.log(`updating the cropping box? ${updateCropper}`);

    // some targets are the buttons children
    if (!target.getAttribute('data-method')) {
      console.log('target doesnt have a method!,using closest!');
      target = target.closest('[data-method]');

      console.log('target is now');
      console.log(target);
   }

    // if not a button click, or button is disabled, igore
    if ( !target || target.disabled ) { return; }


    let data = {
      main: target.getAttribute('data-main') || undefined, // instance object that has the method
      method: target.getAttribute('data-method'), // object method to call
      value: target.value, // value of an input tag
      effects: target.getAttribute('data-effects') || undefined, // does this value act on another value,
      option: target.getAttribute('data-option') || undefined, // value to pass to method
      secondOption: target.getAttribute('data-second-option') || undefined // second value to pass to method
    };
    let updateMosaic = false;


    switch(data.main){
      // user changing a basic globals setting
      case 'globals':
        // plate count, color choice
        console.log(` - setting Globals.${data.method} = ${data.option}`);
        Globals[data.method] = data.option;
        updateMosaic = true;

        break;
      // user changing a custom palette / bg color
      case 'palette': {
        let type = data.method;
        let classname = 'active';
        let rgb = target.getAttribute('data-rgb') || undefined;
        if(rgb !== undefined){ target.classList.toggle(classname); }
        updateMosaic = true;

        // updates the custom palette, add removes colors
        if(type == 'palette'){
          let method = target.classList.contains(classname) ? 'addColor' : 'removeColor';
          Globals[method](rgb);
          updateMosaic = true;
          break;
        }

        // selected and deselecting the colors to use in the bg
        let max = data.option;
        if(type == 'bgColors'){
          // get colors allowed for bg pattern
          let selected = document.getElementById('bgContent').querySelector('input[type=radio]:checked');
          max = parseInt(selected.getAttribute('data-option'));
          // whether or not to select / dese;ect color for bg
          let add = target.classList.contains(classname);
          if(add){
            Globals.bgColors.push(rgb);
            if(Globals.bgColors.length > max) { Globals.bgColors.shift(); }
          }
          else{
            let temp = Globals.bgColors.filter(stored => stored !== rgb);
            Globals.bgColors = temp;
          }
        }

        // changing the pattern of the removed background
        // make sure the selected color deisplay, is not selected more than allowed
        if(type == 'bgPattern'){
          Globals.bgPattern = data.value;
          if(Globals.bgColors.length <= max) { break;}
          Globals.bgColors.splice(max);
        }


        // update the selected color visuals for the new stored value changes
        let list = document.getElementById('bgPalette').querySelectorAll('.'+classname);
        for(let i=0; i<list.length; i++){
          if( !Globals.bgColors.includes(list[i].getAttribute('data-rgb')) ){
            list[i].classList.remove(classname);
          }
        }

        break;
      }
      // user is changing the crop of the image!!!
      case 'cropper':
        if(!CROPPER || !CROPPER.cropped){ break; }

        // zoom, rotate
        let cropperResult = CROPPER[data.method](data.option, data.secondOption);
        // updateMosaic = true;

        break;
      case 'caman':
        // console.table(Object.keys(Caman.prototype));
        // if no image uplaoded yet, cancel slider move and reset values
        if(UploadedImage.file === null){
          UploadedImage.resetAllFilters();
          break;
        }
        // if reset, reset the slider
        if(data.option == 'reset'){
          document.getElementById(data.method+"Range").value = data.value;
        }

        // get preset bool
        let preset = target.getAttribute('data-preset');

        // if reset all
        if(data.method == 'reset'){
          UploadedImage.resetPresets();
          UploadedImage.resetAllFilters();
        }
        else if(preset){ // a preset button hit
          // reset all sliders
          UploadedImage.resetAllFilters();
          // apply selected preset
          UploadedImage.usePreset = true;
          UploadedImage.preset = data.method;
        }
        else { // a slider change
          // store slider value
          UploadedImage.setFilterList(data.method, data.value);
          console.log(`method: ${data.method}, value: ${data.value}`);
        }

        // apply filter to cropped canvas
        applyFilters();
        break;
    }; // end switch


    // this button affects another button!!!!!
    if(data.effects !== undefined){
      // all effects should be formatted 'ID-type,...'
      // let allEffects = data.effects.split(',')
      let [btn, category] = data.effects.split('-');
      console.log(`btn is ${btn}`);
      console.log(`category is ${category}`);

      switch(category) {
        case 'dropdown':
          document.getElementById(btn).textContent = data.option;
          let prev = target.parentNode.querySelector('.active');
          if(prev){prev.classList.remove('active');}
          target.classList.add('active');
          break;
      }
    } // handle effects cascade


    // user is changing the crop settings!!
    switch (data.method) {
      case 'zoom':
        // calling autoface from zoom is laggy and bad
        // but maybe moving the canvas so that on zoom the cropped selection stays in bounds of the display
        break;
      case 'plateHeight':
      case 'plateWidth':
          // no crop initialized, so no need to adjust the crop box
          if(!CROPPER || !CROPPER.cropped || UploadedImage.file === null){
            CROPPER_OPTIONS.aspectRatio = Globals.aspectRatio;
            CROPPER.setAspectRatio(Globals.aspectRatio);
            break;
          }
          let changingWidth = data.method.split('plate')[0].toLowerCase() == 'width';
          let currentCBD = CROPPER.getCropBoxData();
          CROPPER_OPTIONS.aspectRatio = Globals.aspectRatio;
          // set ratio triggers the crop event, don't call need to call display mosaics then
          UploadedImage.callOnCrop = false;
          CROPPER.setAspectRatio(Globals.aspectRatio);
          // let centerLEFT = currentCBD.width * .5 + currentCBD.left;
          // let centerTOP = currentCBD.height * .5 + currentCBD.top;

          let newWidth = changingWidth ? currentCBD.height * Globals.aspectRatio : currentCBD.width;
          let newHeight = !changingWidth ? currentCBD.width / Globals.aspectRatio : currentCBD.height;
          let newCBDdata = {
            width: newWidth,
            height: newHeight,
            left: currentCBD.left,
            top: currentCBD.top,
            // left: changingWidth ? centerLEFT - (newWidth*.5) : currentCBD.left,
            // top: !changingWidth ? centerTOP - (newHeight*.5) : currentCBD.top,
          };

          UploadedImage.callOnCrop = false;
          CROPPER.setCropBoxData(newCBDdata);
          break;
      case 'autoface':
          updateMosaic = false;
          getImageForAutoFace();
          break;
    }

    if(updateMosaic){
      let str = 'from click listener updateMosaic bool';
      DISPLAY_MOSAICS(str); }


    // remove bg checkmark
      // bg disabled = !this.checked;
      // if checked && !Globals.sansBg
        // make a call to remove bg and set result to sansBg
        // call tile mosaic to display no bg mosaic
      // if !checked
        // change display to use bg and call tile mosaic
    // remove bg
      // solid or burst
        // change globals to use solid  / burst bg
      // swap colors
        // switch order of color for burst
      // make call to tile mosaic

  }


  // return a copty of the canvas
  function getFilterPrep(done){
    let canvas = UploadedImage.moasicOptions.canvas;
    let imgData = canvas.getContext('2d').getImageData(0,0,canvas.width, canvas.height);
    let copyCanvas = canvas.cloneNode();
    copyCanvas.getContext('2d').putImageData(imgData, 0, 0);
    if(!done){
      console.log('no callback function passed! creating one!');
      done = function(resp){
          console.log(resp);
          // pass same options but use the copy canvas so the filters aren't layered on previous filters;
          let ops = Object.assign({}, UploadedImage.moasicOptions, {filterCanvas: resp} );
          canvasPreview(ops);
          // for dev see what the non-tiled cropped section looks like
          SLIDER_CROPPED.innerHTML = '';
          SLIDER_CROPPED.appendChild(resp);
      };
    }
    return {
      canvas: copyCanvas,
      done: done,
    };
  }

  // apply filters to a copy of the canvas, these filters do stack, so a copy is necessary
  function applyFilters(done){
    let prep = getFilterPrep(done);
    let canvas = prep.canvas;
    done = prep.done;

    Caman(canvas, function() {
      // use caman preset if preset bool
      if(UploadedImage.usePreset){
        this[ UploadedImage.preset ]();
      }
      if(UploadedImage.applyFilters) {
        for ( let [key, value] of Object.entries( UploadedImage.filterList ) ){
          this[ key ]( value );
        }
      }
      this.render(function(){
        done(this.canvas);
      });
    });
  }

  const SAVE_MOSAIC = document.getElementById('save');
  SAVE_MOSAIC.onclick = function(){
    // needs a better check for accurate mosaic data
    if(!Globals.hasOwnProperty('mosaic') || !Globals.hasOwnProperty('materials')){
      throw new Error('no mosaic data was saved');
    }
    const csrftoken = getCookie('csrftoken');

    let headers = {
      'X-CSRFToken': csrftoken,
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json'
    }

    SAVE_MOSAIC.disabled = true;
    fetch("setColorData/", {
        method: 'POST',
        body: JSON.stringify({
          color: Globals.color,
          mosaic: Globals.mosaic,
          materials: Globals.materials,
          plates: Globals.plateCount,
        }),
        headers: headers,
        // credentials: 'same-origin',
    })
    .then(
      function(response) {
        if (response.status < 200 || response.status > 200) {
          console.log('save mosaic to server not ok. Status code: ' + response.status);
          SAVE_MOSAIC.disabled = false;
          return
        }
        response.json().then(function(resp) {
          console.log('save mosaic came back ok: ' + resp);
          SAVE_MOSAIC.disabled = false;
        })
      }
    )
    .catch(function(err) {
      console.log('save mosaic data Error: ', err);
      SAVE_MOSAIC.disabled = false;
    });
  } // end click save

  // a js snippit to get the cookie from a browser
  function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
// setup use with dither js
// function ditherResult(canvas, options){
//
//   if(!options || !canvas){canvas = getCropperCanvas();}
//   // CONTAINER_RESULT.appendChild(canvas);
//
//   // options with defaults (not required)
//   var opts = {
//       // Transparent pixels will result in a sparse indexed array
//       reIndex: false,                       // affects predefined palettes only. if true, allows compacting of sparsed palette once target palette size is reached. also enables palette sorting.
//       palette: Globals.paletteAsArray,    // a predefined palette to start with in r,g,b tuple format: [[r,g,b],[r,g,b]...]
//       colorDist: Globals.colorDist[0],      // one of ['euclidean', 'manhattan']
//       dithKern: Globals.ditherKernals[0],   // dithering kernel name, see available kernels in docs below
//       dithDelta: 0,            // dithering threshhold (0-1) e.g: 0.05 will not dither colors with <= 5% difference
//       dithSerp: false,         // enable serpentine pattern dithering
//       method: 2,               // histogram method, 2: min-population threshold within subregions; 1: global top-population
//       boxSize: [64,64],        // subregion dims (if method = 2)
//       boxPxls: 2,              // min-population threshold (if method = 2)
//       initColors: 4096,        // # of top-occurring colors  to start with (if method = 1)
//       minHueCols: 0,           // # of colors per hue group to evaluate regardless of counts, to retain low-count hues
//       useCache: false,         // enables caching for perf usually, but can reduce perf in some cases, like pre-def palettes
//       cacheFreq: 10,           // min color occurance count needed to qualify for caching
//       // colors: 256,          // desired palette size
//   };
//
//   let q = new RgbQuant(Object.assign({}, opts, options));
//
//   // q.sample(canvas);
//   // const palette = q.palette(true);
//   let output = q.reduce(canvas);
//   // console.log(output);
//   let ctx = canvas.getContext('2d');
//   ctx.putImageData(handleUnit8Array(canvas, output), 0, 0);
//
//   return canvas;
//
// }
//
// function handleUnit8Array(canvas, arry) {
//   let imageData = new ImageData(canvas.width, canvas.height);
//   for (var i=0;i < arry.length; i+=4) {
//       imageData.data[i]   = arry[i];
//       imageData.data[i+1] = arry[i+1];
//       imageData.data[i+2] = arry[i+2];
//       imageData.data[i+3] = arry[i+3];
//   }
//   return imageData;
// }

})( window );
