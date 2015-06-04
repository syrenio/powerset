/**
 * Created by Bernd on 24.05.2015.
 */

(function(window){

    /* OPTIONS */
    /**
     * Powerset options
     *
     * @class PowersetOptions
     * @constructor
     */
    window.PowersetOptions = function() {
        /**
         * Render size of the Powerset
         * @property size
         * @type {Object}
         * @default "{ height : 500, width : 700}"
         */
        this.size = {
            height : 500,
            width : 700
        };
        /**
         * Show percent in control panel by total size or by max size(largest member)
         * @property controlPanelPercentByTotal
         * @type {boolean}
         * @default false
         */
        this.controlPanelPercentByTotal= false;
        /**
         * Padding between Groups (Degree)
         * @property groupSetPadding
         * @type {integer}
         * @default 5
         */
        this.groupSetPadding= 5;
        /**
         * Padding between Sets
         * @property setPadding
         * @type {integer}
         * @default 5
         */
        this.setPadding= 5;
        /**
         * Minimal height of a set
         * @property minimalSetHeight
         * @type {integer}
         * @default 5
         */
        this.minimalSetHeight= 5;
        /**
         * Minimal width of a set
         * @property minimalSetWidth
         * @type {integer}
         * @default 10
         */
        this.minimalSetWidth= 10;
        /**
         * Shows much percent are reserved for the "+Show more Block"
         * @property showMorePercent
         * @type {integer}
         * @default 10
         */
        this.showMorePercent= 10;
        /**
         * Show the text of sets
         * @property showSubsetTexts
         * @type {boolean}
         * @default true
         */
        this.showSubsetTexts= true;
        /**
         * Show selection in Subsets
         * @property showSubsetSelection
         * @type {boolean}
         * @default true
         */
        this.showSubsetSelection= true;
        /**
         * Display sets without data
         * @property showSubsetWithoutData
         * @type {boolean}
         * @default true
         */
        this.showSubsetWithoutData= true;
        /**
         * Default selected attribute if exists
         * @property defaultColorByAttribute
         * @type {string}
         * @default "Time Watched"
         */
        this.defaultColorByAttribute= "Times Watched";
        /**
         * Color scale for coloring by attribute
         * @property colorByAttributeValues
         * @type {object}
         * @default "{min:{color:"white"},max:{color:"darkblue"}}"
         */
        this.colorByAttributeValues= {
            min: {color: "white"},
            max: {color: "darkblue"}
        };
    };
})(window);