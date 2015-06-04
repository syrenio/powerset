/* global usedSets */
/* global setIdToSet */
/* global queryParameters */
/* global UpSet */
/* global Powerset */
/* global ROW_TYPE */
/* global attributes */
/* global d3 */
/* global $ */

Array.prototype.unique = function() {
    var a = this.concat();
    for(var i=0; i<a.length; ++i) {
        for(var j=i+1; j<a.length; ++j) {
            if(a[i] === a[j])
                a.splice(j, 1);
        }
    }
    return a;
};

(function(window) {

  console.log("powerset registered!");
  window.document.title += " - Powerset!";

  /**
   * Powerset implementation with D3
   * based on Calculation form Upset
   *
   * @class PowerSet
   * @constructor
   */
  var ps = window.Powerset = function PowerSet(c, rr, s, options) {
    var that = this;
    var svg = d3.select("#bodyVis").select("svg");
    var ctx = c;
    var renderRows = rr;
    var sets = s;

    var openSets = [];
    var selectedSets = [];
    
    that.options = $.extend({}, new PowersetOptions(), options);

    that.colorByAttribute = setAttributeOrFirstAttribute(that.options.defaultColorByAttribute);

    $("#bodyVis").prepend("<div id='ps-control-panel' class='ps-control-panel'></div>");

    var controlPanel = $("#ps-control-panel");

    //add change handler for powerset
    $("#header-ds-selector").change(datasetChangeHandler);

    /**
     * Trigger clearing of selection
     *
     * @private
     */
    function datasetChangeHandler(evt){
      while(selections.list.length > 0) {
        selections.removeSelection(selections.list[0]);
      }
      selectedSets.forEach(function(d){d.active=false;});
      that.draw();
    }

    /**
     * get group rows from renderRows
     *
     * @private
     * @return group rows
     */
    function getGroupRows() {
      function fnCheck(d) {
        return (d.data.type === ROW_TYPE.GROUP || d.data.type === ROW_TYPE.AGGREGATE);
      }
      return renderRows.filter(function(d) {
        return fnCheck(d);
      });
    }

    /**
     * get sets from renderRows
     *
     * @private
     * @return sets
     */
    function getSubsetRows() {
      return renderRows.filter(function(d) {
        return d.data.type === ROW_TYPE.SUBSET;
      });
    }

    /**
     * set and get attribute by given name (attribute select)
     *
     * @private
     * @params {string} name attribute name
     * @method setAttributeOrFirstAttribute
     * @return attribute name
     */
    function setAttributeOrFirstAttribute(name){
      var fattrs = getAttributes().filter(function(d){return d.name===name;});
      if(fattrs && fattrs.length > 0){
        name = fattrs[0].name;
      }else{
        name = getAttributes()[0].name;
      }
      return name;
    }

    /**
     * get attribute and filter ignored ones
     *
     * @private
     * @method getAttributes
     */
    function getAttributes() {
      var ignoredSetNames = ["Set Count", "Sets"];
      var list = [];
      for (var i = attributes.length - 1; i >= 0; i--) {
        if (ignoredSetNames.indexOf(attributes[i].name) === -1) {
          list.push(attributes[i]);
        }
      }
      return list;
    }

    /**
     * get attribute value form attributes arry by given name,item
     *
     * @private
     * @param {string} name
     * @param {string} itm
     * @method getAttributeValue
     */
    function getAttributeValue(name, itm) {
      for (var i = attributes.length - 1; i >= 0; i--) {
        var attr = attributes[i];
        if (attr.name === name) {
          return attr.values[itm];
        }
      }
    }

    /**
     * get attribute form attributes arry by given name
     *
     * @private
     * @param {string} name
     * @method getAttributeByName
     */
    function getAttributeByName(name) {
      for (var i = attributes.length - 1; i >= 0; i--) {
        var attr = attributes[i];
        if (attr.name === name) {
          return attr;
        }
      }
    }

    /**
     * get render row by given id
     * e.g.:: "1280_1"  (id from upset calculation)
     *
     * @private
     * @param {integer} id unique id for each render row
     * @method getRenderRowById
     */
    function getRenderRowById(id) {
      return renderRows.filter(function(d) {
        return d.data.id === id;
      })[0];
    }

    /**
     * remove the control panel
     *
     * @method clear
     */
    this.clear = function() {
      $("#ps-control-panel").remove();
    };


    function calcGroupHeights(groupRows, svgHeight) {
      var allSizes = 0;
      groupRows.forEach(function (group, idx) {
        if (typeof(openSets[idx]) == "undefined") {
          openSets[idx] = true;
        }
        if (openSets[idx]) {
          allSizes += group.data.setSize;
        }
      });

      var groupHeights = [];
      var minHeight = that.options.minimalSetHeight;
      var groups = (groupRows.length);
      var x = (svgHeight - (that.options.groupSetPadding * groups) - (minHeight * groups)) / allSizes;
      groupRows.forEach(function (set, idx) {
        if (openSets[idx]) {
          groupHeights[idx] = parseFloat((set.data.setSize * x).toFixed(3), 10) + minHeight;
        } else {
          groupHeights[idx] = minHeight;
        }
      });
      return groupHeights;
    }

    /**
     * main draw methods (draw groups, sets, control panel, modal)
     *
     * @method draw
     */
    this.draw = function() {

      var groupRows = getGroupRows();
      svg.attr("height", that.options.size.height);
      svg.attr("width", that.options.size.width);
      var svgWidth = parseInt(svg.attr("width"), 10);
      var svgHeight = parseInt(svg.attr("height"), 10);
      var rectsWidth = svgWidth - 30;

      /* init loop */
      var groupHeights = calcGroupHeights(groupRows, svgHeight);

      // TODO: insert <g>
      svg.selectAll("rect.pw-gset").remove();
      var groupRects = svg.selectAll("rect.pw-gset").data(groupRows);
      groupRects.enter()
          .append("rect")
          .attr("class", function (d, idx) {
            return "pw-gset pw-gset-" + idx;
          })
          .attr("x", 20)
          .attr("y", function (d, idx) {
            var prevHeights = groupHeights.filter(function (x, i) {
              return i < idx;
            });
            var prevHeight = 0;
            if (prevHeights.length > 0) {
              prevHeight = prevHeights.reduce(function (r, x) {
                return r + x;
              });
            }
            prevHeight += (that.options.groupSetPadding * idx);
            return prevHeight;
          })
          .attr("width", rectsWidth)
          .attr("height", function (d, idx) {
            return groupHeights[idx];
          });
      groupRects.exit().remove();

      svg.selectAll("text.pw-gtext").remove();
      var gTexts = svg.selectAll("text.pw-gtext").data(groupRows);
      gTexts.enter()
          .append("text")
          .text(function (d, idx) {
            return idx;
          })
          .attr("class", function(d,idx){return "pw-gtext pw-gtext-" + idx;})
          .attr("x", 5)
          .attr("dy", ".35em")
          .attr("y", function (d, idx) {
            var prevHeights = groupHeights.filter(function (x, i) {
              return i < idx;
            });
            var prevHeight = 0;
            if (prevHeights.length > 0) {
              prevHeight = prevHeights.reduce(function (r, x) {
                return r + x;
              });
            }
            prevHeight += (that.options.groupSetPadding * idx);
            var val = groupHeights[idx];
            return (val / 2) + prevHeight;
          });
      gTexts.exit().remove();

      drawSubsets(svg, groupRects, rectsWidth);
      drawSetsBySize();
      drawElementsByDegree();


      createStyle();
      createAttributeSelect();

      cleanupUpsetParts();

    };

    /**
     * remove or hide all the upset elements we dont need
     *
     * @private
     * @method cleanupUpsetParts
     */
    function cleanupUpsetParts(){
      /* clean upset elements */
      var arrElements = [".columnBackgroundsGroup", ".gRows", ".toolTipLayer", ".logicPanel", ".tableHeaderGroup", "#aboutUpset", "#element-viewers-container", ".element-visualization-header"];
      var arrHide = [".ui-column.ui-layout-west"];
      $(arrElements.join(",")).remove();
      $(arrHide.join(",")).hide();
    }

    /**
     * get the visual statistic for current attribute
     *
     * @private
     * @method getVisualStats
     */
    function getVisualStats(){
      return ctx.summaryStatisticVis.filter(function(x) {
        if (that.colorByAttribute === x.attribute) {
          return x;
        }
      })[0];
    }

    /**
     * clear and redraw all rects for the powerset
     *
     * @private
     * @param {SVG} svg svg where all the rects are located
     * @param {array} setRects list of all the sets
     * @param {integer} rectsWidth usable with for total rects
     * @method drawSubsets
     */
    function drawSubsets(svg, setRects, rectsWidth) {

      svg.selectAll("rect.pw-set").remove();
      svg.selectAll("rect.pw-set-sel").remove();
      svg.selectAll("text.pw-set-text").remove();
      //workaround foreignObjects (foreignObject camelCase not working in webkit)
      svg.selectAll(".pw-set-text").remove();
      svg.selectAll(".pw-set-more").remove();
      svg.selectAll(".pw-set-more-text").remove();
      setRects.each(function(d, idx) {
        drawSubset(svg, rectsWidth, this, d, idx, true);
      });
    }

    /**
     * draw all the sets/rects for given degree/group
     *
     * @private
     * @param {SVG} svg svg where all the rects are located
     * @param {integer} rectsWidth usable with for total rects
     * @param {array} elm group element draws before the sets
     * @param {object} elmData data of the elm (group)
     * @param {integer} row current row index
     * @param {boolean} activeMoreBlock indicates if the "more block" is active
     * @method drawSubsets
     */
    function drawSubset(svg, rectsWidth, elm, elmData, row, activeMoreBlock){
      var g = d3.select(elm);
      var x = parseInt(g.attr("x"), 10);
      var y = parseInt(g.attr("y"), 10);
      var gWidth = rectsWidth;
      var gHeight = parseInt(g.attr("height"), 10);

      var data = elmData.data || elmData;

      var groupSetSize = data.setSize || 0;

      // TODO maybe use subsetRows --> more information
      var subsets = data.subSets || [];

      subsets.sort(function(a,b){
        if(b.setSize === a.setSize)
        {
          return (a.elementName < b.elementName) ? -1 : (a.elementName > b.elementName) ? 1 : 0;
        }
        else
        {
          return (b.setSize < a.setSize) ? -1 : 1;
        }
        //return b.setSize - a.setSize || a.elementName - b.elementName;
      });

      if (that.options.showSubsetWithoutData) {
        subsets = subsets.filter(function(d) {
          return d.setSize > 0;
        });
      }

      // TODO: calc width and the sets that will be displayed and add minWdith for them.
      var setWidths = [];
      var minWidth = that.options.minimalSetWidth;
      var lsets = subsets.length;
      var usableWidth = (gWidth - (that.options.setPadding * (lsets - 1)) /*- (minWidth * lsets ) */);
      var setwidth = usableWidth / groupSetSize;
      var setSizeInfos = [];

      //calc withs
      subsets.forEach(function(set, idx) {
        var w = parseFloat((set.setSize * setwidth).toFixed(3), 10);
        setSizeInfos[idx] = w < minWidth;
        setWidths[idx] = w;
      });

      //calc with adjusted widths
      if(activeMoreBlock) {
        usableWidth = (gWidth - (that.options.setPadding * (lsets - 1)) - (minWidth * setSizeInfos.filter(function (d) {
          return d;
        }).length ));
        setwidth = usableWidth / groupSetSize;
        subsets.forEach(function (set, idx) {
          var w = parseFloat((set.setSize * setwidth).toFixed(3), 10);
          setWidths[idx] = w < minWidth ? minWidth : w;
        });
      }

      var height = (gHeight);

      var lastX = null;
      var lastIdx = null;

      function getPreviousWidth(idx){
        var prevWidths = setWidths.filter(function(x,i){return i < idx; });
        var prevWidth = 0;
        if(prevWidths.length > 0){
          prevWidth = prevWidths.reduce(function(r,x){return r+x;});
        }
        prevWidth += (that.options.setPadding * idx);
        return prevWidth;
      }

      function funcDataMedian(d){
        var attr = getAttributeByName(that.colorByAttribute);
        if (ctx.summaryStatisticVis.length) {
          var stats = getVisualStats();
          if(stats){
            var curRenderRow = getRenderRowById(d.id);
            var statistics = stats.visObject.statistics[curRenderRow.id];
            var fixedNumber = attr.type==="float" ? 3 : 0;
            return statistics.median.toFixed(fixedNumber);
          }
        }
      }

      function funcSubSetX(d,i){
        var prevWidth = getPreviousWidth(i);
        var startX = x + prevWidth;
        if(activeMoreBlock){
          var perc = (gWidth * (1 - (that.options.showMorePercent/100)));
          if(startX >= perc){
            if(lastX === null){
              lastX = startX;
              lastIdx = i;
            }
            return -1000;
          }
        }
        return startX;
      }

      function funcSetClass(baseStr){
        return function(d,k){
          var arrValues = [];
          for (var i = d.items.length - 1; i >= 0; i--) {
            var itm = d.items[i];
            var val = getAttributeValue(that.colorByAttribute, itm);
            arrValues.push(val);
          }
          return baseStr+" "+baseStr+"-" + row;
        };
      }

      function getFilteredSelectedItems(items){
        return getSelectedItems().filter(function(d){
          return items.indexOf(d) !== -1;
        });
      }

      function getSetSelectedPercent(items){
        var matched = getFilteredSelectedItems(items);
        return matched.length / items.length;
      }

      // TODO: insert <g>
      svg.selectAll("rect.pw-set-" + row).remove();
      var subSetRects = svg.selectAll("rect.pw-set-" + row).data(subsets);
      subSetRects.enter().append("rect")
        .attr("class", funcSetClass("pw-set"))
        .attr("data-median", funcDataMedian)
        .style({
          fill: function(){
            var stats = getVisualStats();
            if(!stats){
              return '#dedede';
            }
          }
        })
        .attr("x", funcSubSetX)
        .attr("y", function() {
          var row = 0;
          return y + (row * height);
        })
        .attr("width",function(d,idx){
          return setWidths[idx];
        })
        .attr("height", height);
      subSetRects.exit().remove();

      /* show more rect */
      svg.select("rect.pw-set-more-" + row).remove();
      var hiddenSets = subsets.filter(function(x,i){return i >= lastIdx; });
      var prevWidth = getPreviousWidth(lastIdx);
      var nonShownWidths = setWidths.filter(function(x,i){return i >= lastIdx; });
      drawShowMoreRect(row, lastX, y, height, (gWidth-prevWidth), nonShownWidths.length, hiddenSets);

      if(that.options.showSubsetSelection){
        svg.selectAll("rect.pw-set-sel-" + row).remove();
        var subSetSelectionRect = svg.selectAll("rect.pw-set-sel-" + row).data(subsets);
        subSetSelectionRect.enter().append("rect")
            .attr("class", funcSetClass("pw-set-sel"))
            .attr("data-median", funcDataMedian)
            .style({
              fill: "red"
            })
            .attr("x", funcSubSetX)
            .attr("y", function() {
              var row = 0;
              return y + (row * height);
            })
            .attr("width",function(d,idx){
              var per = getSetSelectedPercent(d.items);
              return setWidths[idx] * per;
            })
            .attr("height", height);
        subSetSelectionRect.exit().remove();
      }

      if (that.options.showSubsetTexts) {
        //workaround foreignObjects
        svg.selectAll(".pw-set-text-" + row).remove();
        var subSetTexts = svg.selectAll("foreignObject.pw-set-text-" + row).data(subsets).enter();
        subSetTexts.append("foreignObject")
          .attr("class", "pw-set-text pw-set-text-" + row)
          .attr("x", funcSubSetX)
          .attr("y", function() {
            var row = 0;
            return y + (row * height);
          })
          .attr("height",height)
          .attr("width", function(d,idx){
            return setWidths[idx];
          })
          .attr("text-anchor", "middle")
          .attr("alignment-baseline", "middle")
          .append("xhtml:body")
          .attr("class","pw-set-text-body")
          .style({
            "width": function(d,idx){ return setWidths[idx] + "px"; }
          })
          .append("p")
          .on("click", function(d) {
            createSelection(d.items);
          })
          .attr("class","pw-set-text-center")
          .html(function(d) {
            return d.elementName || "&nbsp;";
          })
          .attr("title", function(d) {
            return d.elementName + " - " + d.setSize + " elements";
          });
      }

    }

    /**
     * draw the "show more" rect
     *
     * @private
     * @param {integer} row row where the rect will be located
     * @param {integer} lastX represents the last used x value
     * @param {integer} y y possition for the rect
     * @param {integer} height
     * @param {integer} width
     * @param {integer} hiddenSetsCount
     * @param {array} hiddenSets list of sets that are hidden in the regular powerset
     * @method drawShowMoreRect
     */
    function drawShowMoreRect(row, lastX, y, height, width, hiddenSetsCount, hiddenSets){
      svg.select("rect.pw-set-more-" + row).remove();
      if(lastX === null){
        return;
      }
      svg.append("rect")
        .attr("class", "pw-set-more pw-set-more-" + row)
        .attr("x", lastX)
        .attr("y", y)
        .attr("width", width)
        .attr("height", height);

     svg.selectAll(".pw-set-more-text-" + row).remove();
     svg.append("foreignObject")
        .attr("class","pw-set-more-text pw-set-more-text-" + row)
        .attr("x", lastX)
        .attr("y", y)
        .attr("width", width)
        .attr("height", height)
        .append("xhtml:body")
        .attr("class","pw-set-text-body")
        .style({
          "width": width + "px"
        })
        .append("p")
        .attr("class","pw-set-text-center")
        .text( hiddenSetsCount + " more")
        .attr("title", hiddenSetsCount + " more")
        .on("click", function(){
          drawShowMoreModal(hiddenSets)
        });
    }

    /**
     * draw the svg element of the modal
     *
     * @private
     * @param {array} hiddenSets list of sets that are hidden in the regular powerset
     * @param {integer} height
     * @param {integer} width
     * @method drawModalSvg
     */
    function drawModalSvg(hiddenSets, height, width){

      //reduce a litte because of modal
      height -= 50;
      width -= 50;

      d3.select("#pw-show-more-modal svg").remove();
      var modalSvg = d3.select("#pw-show-more-modal").append("svg").attr("height",height).attr("width",width);
      var g = modalSvg.append("rect").attr("x",0).attr("y",0).attr("height",height).attr("width",width).style({"fill":"transparent"});
      var obj = { subSets : hiddenSets , setSize : 0};
      hiddenSets.forEach(function(d){
        obj.setSize += d.setSize;
      });

      drawSubset(modalSvg, width, g[0][0], obj, 9999, false);
    }

    /**
     * draw the show more modal + sets
     *
     * @private
     * @param {array} hiddenSets list of sets that are hidden in the regular powerset
     * @method drawShowMoreModal
     */
    function drawShowMoreModal(hiddenSets){
      var modal = $("#pw-show-more-modal");
      if(modal.length > 0){
        modal.remove();
      }
      var bodyVis = $("#bodyVis");
      bodyVis.append("<div id='pw-show-more-modal'>");
      bodyVis.css("position","relative");

      drawModalSvg(hiddenSets,200,500);

      $("#pw-show-more-modal").attr("title","Show more Sets");
      $("#pw-show-more-modal").dialog({
        width: "500px",
        position: { my: "right", at: "right", of: window },
        resizeStop: function(evt,ui){
          drawModalSvg(hiddenSets,ui.size.height.toFixed(0),ui.size.width.toFixed(0));
        }
      });

    }


    /**
     * get element by selected sets
     * given selItems represents a optional base ids
     *
     * @private
     * @param {array} selIetms list of element ids
     * @method getSelectedItems
     */
    function getSelectedItems(selItems){
      var arrselsets = selectedSets.filter(function(d){
        return d.active;
      });
      var arr = selItems || [];
      arrselsets.forEach(function(d){
        arr = arr.concat(d.baseSet.items.filter(function(itm){
          return arr.indexOf(itm) < 0;
        }));
        //arr = arr.concat(d.baseSet.items);
      });
      //return arr.unique();
      return arr;
    }

    /**
     * calculate number for a progress bar
     *
     * @private
     * @param {array} groupRows list of rows
     * @method getCountsForProgressbar
     */
    function getCountsForProgressbar(groupRows) {
      var overallSize = 0;
      var totalSize = groupRows.map(function (d) {
        return d.setSize;
      }).reduce(function (preVal, val) {
        return preVal + val;
      });
      var arr = groupRows.map(function (d) {
        return d.setSize;
      });
      var maxSize = Math.max.apply(null, arr);

      if (that.options.controlPanelPercentByTotal) {
        overallSize = totalSize;
      } else {
        overallSize = maxSize;
      }
      return {totalSize: totalSize, overallSize: overallSize};
    }

    /**
     * create a selection with given items and the selection engine
     *
     * @private
     * @param {array} items a list of item ids
     * @method createSelection
     */
    function createSelection(items){
      if(selections.list.length > 0){
        selections.removeSelection( selections.list[0]);
      }
      var selection = new Selection(items, new FilterCollection("#filters-controls", "#filters-list"));
      selections.addSelection(selection, true);
      selections.setActive(selection);
    }

    /**
     * draw control panel element "sets by size"
     *
     * @private
     * @method drawSetsBySize
     */
    function drawSetsBySize(){
      var subsetRows = usedSets.sort(function(a,b){
        return b.setSize - a.setSize;
      });

      var counts = getCountsForProgressbar(subsetRows);

      controlPanel.find("#ps-control-panel-sets").remove();
      var setsPanel = controlPanel.append("<div id='ps-control-panel-sets'></div>").find("#ps-control-panel-sets");
      setsPanel.append("<h3>Sets by size");

      setsPanel.append("<div class='elm-by-sets-scale'><span>0</span><span>" + counts.overallSize + "</span></div>");

      setsPanel.append("<div id='elm-by-sets-rows'></div>");
      var rows = d3.select("#elm-by-sets-rows").selectAll("div.row").data(subsetRows);
      rows.enter()
        .append("div")
        .classed({
          "row": true
        })
        .html(function(d, idx) {
          //init selectedSets
          if(typeof(selectedSets[idx]) == "undefined"){
            selectedSets[idx] = {active:false, baseSet: d};
          }

          var checked = selectedSets[idx].active ? "checked='checked'" : "";

          var str = "<input type='checkbox' " + checked + " value='" + idx + "' class='chk-set-size' id='chk-set-size-" + idx + "' data-basesetid='" + d.id + "'>";
          str += "<span>" + d.elementName + "</span>";
          var titleText = d.elementName + " - " + (d.setSize / counts.totalSize * 100).toFixed(3);
          str += "<progress title='" + titleText + "' value='" + (d.setSize / counts.overallSize * 100) + "' max='100'></progress>";
          return str;
        });
      rows.exit().remove();

      $("input.chk-set-size").on("change",function(){

        var idx = $(this).val();
        var baseSetId = $(this).data("basesetid");
        var baseSet = setIdToSet[baseSetId];
        console.log("change: ",selectedSets[idx].active," => ", !selectedSets[idx].active);
        selectedSets[idx].active = !selectedSets[idx].active;
        selectedSets[idx].baseSet = baseSet;
        that.draw();

        createSelection(getSelectedItems());
      });

    }

    /**
     * draw control panel element "elements by degree"
     *
     * @private
     * @method drawElementsByDegree
     */
    function drawElementsByDegree() {
      var groupRows = getGroupRows();
      groupRows = groupRows.map(function(d){
        return d.data;
      });
      var counts = getCountsForProgressbar(groupRows);
      controlPanel.find("#ps-control-panel-degree").remove();
      var degPanel = controlPanel.append("<div id='ps-control-panel-degree'></div>").find("#ps-control-panel-degree");
      degPanel.append("<h3>Elements by Degree");
      degPanel.append("<div class='elm-by-deg-scale'><span>0</span><span>" + counts.overallSize + "</span></div>");
      degPanel.append("<div id='elm-by-deg-rows'></div>");

      var rows = d3.select("#elm-by-deg-rows").selectAll("div.row").data(groupRows);
      rows.enter()
          .append("div")
          .classed({
            "row": true
          })
          .html(function (d, idx) {
            var checked = openSets[idx] ? "checked='checked'" : "";

            var str = "<input type='checkbox' " + checked + " value='" + idx + "' class='chk-set-degree'>";
            str += "<span>" + idx + "</span>";
            var titleText = d.elementName + " - " + (d.setSize / counts.totalSize * 100).toFixed(3);
            str += "<progress title='" + titleText + "' value='" + (d.setSize / counts.overallSize * 100) + "' max='100'></progress>";
            return str;
          });
      rows.exit().remove();

      $("input.chk-set-degree").on("change", function () {
        var openSetIdx = $(this).val();
        console.log("change: ", openSets[openSetIdx], " => ", !openSets[openSetIdx]);
        openSets[openSetIdx] = !openSets[openSetIdx];

        var groupRows = getGroupRows();
        var svgHeight = parseInt(svg.attr("height"), 10);
        var groupHeights = calcGroupHeights(groupRows, svgHeight);
        var toSelect = [".pw-gset-"+openSetIdx, ".pw-set-sel-"+openSetIdx, ".pw-set-"+openSetIdx, ".pw-set-text-"+openSetIdx];

        console.log(groupHeights);

        function getPrevHeight(idx){
          var prevHeights = groupHeights.filter(function (x, i) {
            return i < idx;
          });
          var prevHeight = 0;
          if (prevHeights.length > 0) {
            prevHeight = prevHeights.reduce(function (r, x) {
              return r + x;
            });
          }
          prevHeight += (that.options.groupSetPadding * idx);
          return prevHeight;
        }

        groupHeights.forEach(function(itm,idx){
          console.log(idx,groupHeights[idx]);
          var y = getPrevHeight(idx);
          var arr = [".pw-gset-"+idx, ".pw-set-sel-"+idx, ".pw-set-"+idx, ".pw-set-text-"+idx, ".pw-set-more-"+idx, ".pw-set-more-text-"+idx];
          var gtextY = (groupHeights[idx] / 2) + y;
          svg.selectAll(".pw-gtext-"+idx).transition().duration(300).attr({"y":gtextY});
          svg.selectAll(arr).transition().duration(300).attr({"y": y, "height":groupHeights[idx]});
        });
      });
    }

    /**
     * create css style class for given attribute
     *
     * @private
     * @param {string} attr
     * @method createStyleItems
     */
    function createStyleItems(attr) {
      var min = that.options.colorByAttributeValues.min;
      var max = that.options.colorByAttributeValues.max;
      var colorScale = d3.scale.linear().domain([attr.min,attr.max]).range([min.color,max.color]);
      var arr = [];

      var subsetRects = svg.selectAll("rect.pw-set");
      subsetRects.each(function() {
        var rect = $(this);
        var median = rect.data("median");
        var hexColor = colorScale(median);
        arr.push({
          name: "rect.pw-set[data-median='" + median + "']",
          styles: ["fill:" + hexColor]
        });
      });
      return arr;
    }

    /**
     * create style tag with css classes
     *
     * @private
     * @method createStyle
     */
    function createStyle() {
      var attr = getAttributes().filter(function(d){ return d.name===that.colorByAttribute;})[0];
      if(!attr){
        attr = getAttributes()[0];
      }

      var pwStyle = $("#pw-style");
      if(pwStyle.length > 0){
        pwStyle.remove();
      }
      var arrStyles = [];
      if(attr && attr.type==="integer"){
        arrStyles = createStyleItems(attr);
      }else if(attr && attr.type==="float"){
        arrStyles = createStyleItems(attr);
      }

      var mapped = arrStyles.map(function(d) {
        return d.name + "{" + d.styles.join(";") + "}";
      });

      $('head').append('<style id="pw-style" type="text/css">' + mapped.join(" ") + '</style>');

    }

    function setColorByAttribute(e){
      that.colorByAttribute = e.currentTarget.value;
      createStyle();
      that.draw();
    }

    /**
     * create attribute selector
     * recreate if attribute-count would change
     *
     * @private
     * @method createAttributeSelect
     */
    function createAttributeSelect() {
      var attrSelect = $("#attr-select");
      var prevDatasetId = queryParameters.dataset;
      if(attrSelect.length > 0 && attrSelect.data("datasetid") !== prevDatasetId){
        attrSelect.parent().remove();
        attrSelect = $("#attr-select");
      }
      if (attrSelect.length <= 0) {
        var builder = ["<span> Attribute: "];
        builder.push("<select id='attr-select'>");
        var arr = getAttributes();
        for (var i = arr.length - 1; i >= 0; i--) {
          var x = arr[i];
          var selected = that.colorByAttribute === x.name;
          builder.push("<option value='" + x.name + "' + selected='" + selected + "'>" + x.name + " </option>");
        }
        builder.push("</select>");
        builder.push("</span>");
        $(".header-container").append(builder.join(""));
        var sel = $("#attr-select");
        sel.data("datasetid",queryParameters.dataset);
        sel.on("change",setColorByAttribute);
      }
    }

  };

  /**
   *  Indicates that the powerset is active
   *
   * @property active
   * @type {boolean}
   * @default true
   */
  ps.active = true;

})(window);
