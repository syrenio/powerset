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

  var ps = window.Powerset = function PowerSet(c, rr, s, options) {
    var that = this;
    var svg = d3.select("#bodyVis").select("svg");
    var ctx = c;
    var renderRows = rr;
    var sets = s;

    var openSets = [];
    var selectedSets = [];
    
    that.options = $.extend({}, PowersetOptions, options);

    that.colorByAttribute = setAttributeOrFirstAttribute(that.options.defaultColorByAttribute);

    $("#bodyVis").prepend("<div id='ps-control-panel' class='ps-control-panel'></div>");

    var controlPanel = $("#ps-control-panel");

    function getGroupRows() {
      function fnCheck(d) {
        return (d.data.type === ROW_TYPE.GROUP || d.data.type === ROW_TYPE.AGGREGATE);
      }
      return renderRows.filter(function(d) {
        return fnCheck(d);
      });
    }

    function getSubsetRows() {
      return renderRows.filter(function(d) {
        return d.data.type === ROW_TYPE.SUBSET;
      });
    }

    function setAttributeOrFirstAttribute(name){
      var fattrs = getAttributes().filter(function(d){return d.name===name;});
      if(fattrs && fattrs.length > 0){
        name = fattrs[0].name;
      }else{
        name = getAttributes()[0].name;
      }
      return name;
    }

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

    function getAttributeValue(name, val) {
      for (var i = attributes.length - 1; i >= 0; i--) {
        var attr = attributes[i];
        if (attr.name === name) {
          return attr.values[val];
        }
      }
    }

    function getAttributeByName(name) {
      for (var i = attributes.length - 1; i >= 0; i--) {
        var attr = attributes[i];
        if (attr.name === name) {
          return attr;
        }
      }
    }

    function getRenderRowById(id) {
      return renderRows.filter(function(d) {
        return d.data.id === id;
      })[0];
    }

    this.clear = function() {
      $("#ps-control-panel").remove();
    };

    this.draw = function() {
      var date = new Date();

      var groupRows = getGroupRows();

      //var visContainer = $(document.getElementById("set-vis-container"));
      //svg.attr("height", parseInt(visContainer.height() - 300, 10));
      //svg.attr("width", parseInt(visContainer.width() - 200, 10));
      svg.attr("height",that.options.size.height);
      svg.attr("width",that.options.size.width);
      var svgWidth = parseInt(svg.attr("width"), 10);
      var svgHeight = parseInt(svg.attr("height"), 10);
      var rectsWidth = svgWidth - 30;

      /* init loop */
      var allSizes = 0;
      groupRows.forEach(function(group, idx) {
        if(typeof(openSets[idx]) == "undefined"){
          openSets[idx] = true;
        }
        if(openSets[idx]){
          allSizes += group.data.setSize;
        }
      });

      var groupHeights = [];
      var minHeight = that.options.minimalSetHeight;
      var groups = (groupRows.length);
      var x = (svgHeight - (that.options.groupSetPadding * groups) - (minHeight * groups)) / allSizes;
      groupRows.forEach(function(set, idx) {
        if(openSets[idx]){
          groupHeights[idx] = parseFloat((set.data.setSize * x).toFixed(3),10) + minHeight;
        }else{
          groupHeights[idx] = minHeight;
        }
      });

      // TODO: insert <g>
      svg.selectAll("rect.pw-gset").remove();
      var groupRects = svg.selectAll("rect.pw-gset").data(groupRows);
      groupRects.enter()
        .append("rect")
        .attr("class", function(d, idx) {
          return "pw-gset pw-gset-" + idx;
        })
        .attr("x", 20)
        .attr("y", function(d, idx) {
          var prevHeights = groupHeights.filter(function(x,i){return i < idx; });
          var prevHeight = 0;
          if(prevHeights.length > 0){
            prevHeight = prevHeights.reduce(function(r,x){return r+x;});
          }
          prevHeight += (that.options.groupSetPadding * idx);
          return prevHeight;
        })
        .attr("width", rectsWidth)
        .attr("height", function(d, idx) {
          return groupHeights[idx];
        });
      groupRects.exit().remove();

      svg.selectAll("text.pw-gtext").remove();
      var gTexts = svg.selectAll("text.pw-gtext").data(groupRows);
      gTexts.enter()
        .append("text")
        .text(function(d, idx) {
          return idx;
        })
        .attr("class", "pw-gtext")
        .attr("x", 5)
        .attr("dy",".35em")
        .attr("y", function(d, idx) {
          var prevHeights = groupHeights.filter(function(x,i){return i < idx; });
          var prevHeight = 0;
          if(prevHeights.length > 0){
            prevHeight = prevHeights.reduce(function(r,x){return r+x;});
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

    function cleanupUpsetParts(){
      /* clean upset elements */
      var arrElements = [".columnBackgroundsGroup", ".gRows", ".toolTipLayer", ".logicPanel", ".tableHeaderGroup", "#aboutUpset", "#element-viewers-container", ".element-visualization-header"];
      var arrHide = [".ui-column.ui-layout-west"];
      $(arrElements.join(",")).remove();
      $(arrHide.join(",")).hide();
    }

    function getVisualStats(){
      return ctx.summaryStatisticVis.filter(function(x) {
        if (that.colorByAttribute === x.attribute) {
          return x;
        }
      })[0];
    }

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

    function drawSubset(svg, rectsWidth, elm, d, idx, activeMoreBlock){
      var g = d3.select(elm);
      var x = parseInt(g.attr("x"), 10);
      var y = parseInt(g.attr("y"), 10);
      var gWidth = rectsWidth;
      var gHeight = parseInt(g.attr("height"), 10);

      var data = d.data || d;

      var groupSetSize = data.setSize || 0;

      // TODO maybe use subsetRows --> more information
      var subsets = data.subSets || [];

      subsets.sort(function(a,b){
        return b.setSize - a.setSize;
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
      var setwidth = (gWidth - (that.options.setPadding * (lsets - 1)) /*- (minWidth * lsets ) */) / groupSetSize;
      subsets.forEach(function(set, idx) {
        var w = parseFloat((set.setSize * setwidth).toFixed(3),10);
        if(activeMoreBlock){
          setWidths[idx] = w < minWidth ? w + minWidth : w; //+ minWidth;
        }else{
          setWidths[idx] = w;
        }

      });

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
          return baseStr+" "+baseStr+"-" + idx;
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
      svg.selectAll("rect.pw-set-" + idx).remove();
      var subSetRects = svg.selectAll("rect.pw-set-" + idx).data(subsets);
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
      svg.select("rect.pw-set-more-" + idx).remove();
      var hiddenSets = subsets.filter(function(x,i){return i >= lastIdx; });
      var prevWidth = getPreviousWidth(lastIdx);
      var nonShownWidths = setWidths.filter(function(x,i){return i >= lastIdx; });
      drawShowMoreRect(idx, lastX, y, height, (gWidth-prevWidth), nonShownWidths.length, hiddenSets);

      if(that.options.showSubsetSelection){
        svg.selectAll("rect.pw-set-sel-" + idx).remove();
        var subSetSelectionRect = svg.selectAll("rect.pw-set-sel-" + idx).data(subsets);
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
        svg.selectAll(".pw-set-text-" + idx).remove();
        var subSetTexts = svg.selectAll("foreignObject.pw-set-text-" + idx).data(subsets).enter();
        subSetTexts.append("foreignObject")
          .attr("class", "pw-set-text pw-set-text-" + idx)
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

    function drawShowMoreRect(idx, lastX, y, height, width, hiddenSetsCount, hiddenSets){
      svg.select("rect.pw-set-more-" + idx).remove();
      if(lastX === null){
        return;
      }
      svg.append("rect")
        .attr("class", "pw-set-more pw-set-more-" + idx)
        .attr("x", lastX)
        .attr("y", y)
        .attr("width", width)
        .attr("height", height);

     svg.selectAll(".pw-set-more-text-" + idx).remove();
     svg.append("foreignObject")
        .attr("class","pw-set-more-text pw-set-more-text-" + idx)
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

    function getSelectedItems(selItems){
      var arrselsets = selectedSets.filter(function(d){
        return d.active;
      });
      var arr = selItems || [];
      arrselsets.forEach(function(d){
        arr = arr.concat(d.baseSet.items);
      });
      return arr.unique();
    }

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

    function createSelection(items){
      if(selections.list.length > 0){
        selections.removeSelection( selections.list[0]);
      }
      var selection = new Selection(items, new FilterCollection("#filters-controls", "#filters-list"));
      selections.addSelection(selection, true);
      selections.setActive(selection);
    }

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
        var idx = $(this).val();
        console.log("change: ", openSets[idx], " => ", !openSets[idx]);
        openSets[idx] = !openSets[idx];
        that.draw();
      });

    }


    /*
     var arrStyles = [{
     name: ".pw-set",
     styles: ["fill:#dedede"]
     }];
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

    /*
     * create attribute selector
     * recreate if attribute-count would change
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

  /* OPTIONS */
  var PowersetOptions = {
    size: {
      height : 500,
      width : 700
    },
    /* show percent in control panel by total size or by max size(largest member) */
    controlPanelPercentByTotal: false,
    groupSetPadding: 5,
    setPadding: 5,
    minimalSetHeight: 5,
    minimalSetWidth: 30,
    /* X Percent is reserved for the "+Show more Block" */
    showMorePercent: 10,
    showSubsetTexts: true,
    showSubsetSelection: true,
    showSubsetWithoutData: true,
    defaultColorByAttribute: "Times Watched",
    colorByAttributeValues: {
      min: {color: "white"},
      max: {color: "darkblue"}
    }};


  ps.active = true;

})(window);
