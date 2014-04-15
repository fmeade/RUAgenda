/*
 * TODO: Class Edit, Class Delete
 * TODO: migrate database functionality to 'com.phonegap.plugins.sqlite'
 * @see https://github.com/brodysoft/Cordova-SQLitePlugin
 */
(function () {
    /* yes please */
    'use strict';
    /* ClassSection object maker */
    var makeClassSection = function (_name, _title, _instructor, _location, _times) {
        // create a new object from the Object prototype
        var that = Object.create(null);
        // add class section properties to it
        that.name = _name;
        that.title = _title;
        that.instructor = _instructor;
        that.location = _location;
        that.times = _times;
        that.assignments = [];
        // return the extended object
        return that;
    };
    /* Our primary namespace, bound to 'window' so we can access it from in HTML */
    window.app = {
        // Application "Constructor"
        initialize: function () {
            this.bindEvents();
        },
        
        // Bind Event Listeners
        // Bind any events that are required on startup. Common events are:
        // 'load', 'deviceready', 'offline', and 'online'.
        bindEvents: function () {
            document.addEventListener('deviceready', this.onDeviceReady, false);
            
            $("#edit-class-cancel").on("click", this.classPopupCancelHandler);
            $("#edit-class-save").on("click", this.classPopupSaveHandler);
            $("#edit-class").on("popupafterclose", this.classPopupOnCloseHandler);
        },
        
        // initialze the local storage database
        initializeLDB: function () {
            html5sql.openDatabase("edu.radford.agenda.db", "RU-Agena-DB", 1024 * 1024 * 5);
            html5sql.process(
                [
                    "create table if not exists Classes ( cname TEXT PRIMARY KEY NOT NULL, ctitle TEXT DEFAULT '' NOT NULL, instructor TEXT, location TEXT, times TEXT );",
                    "insert or ignore into Classes ( cname ) values ( 'none' );",
                    "create table if not exists Assignments ( id INTEGER PRIMARY KEY AUTOINCREMENT, course TEXT NOT NULL REFERENCES Classes(cname) DEFAULT 'none', name TEXT NOT NULL DEFAULT 'Assignment', description TEXT DEFAULT '', dueDate INTEGER, notify INTEGER NOT NULL DEFAULT 0 CHECK(notify == 0 or notify == 1), whenNotify  INTEGER );"
                ],
                function () {
                    console.log("Initialized local database tables");
                },
                app.logSqlError
            );
        },
        
        /***************************************************************************
         * Event handlers
         **************************************************************************/

        /* deviceready Event Handler
         * >> the phonegap api is not ready until this method is called!
         * The scope of 'this' is the event. In order to call the 'receivedEvent'
         * function, we must explicity call 'app.receivedEvent(...);'
         */
        onDeviceReady: function () {
            app.initializeLDB();
            /* Delete this - for initial population if you need more data
             * app.makeSampleClasses(); */
            app.classList.populateClassList();
        },
        // buttons that trigger the class detail dialog
        addNewClassHandler: function (event) {
            $("#edit-class-delete").hide();
            $("#edit-class-id").prop("disabled", false);
            $("#edit-class").popup("open");
        },
        editClassHandler: function (event) {
            $("#edit-class-delete").show();
            $("#edit-class-id").prop("disabled", true);
            // need to pre-populate the form w/ values
            // HOW do we do that?
            console.log(event.target.id);
            
            $("#edit-class-id").val();
            $("#edit-class-title").val();
            $("#edit-class-who").val();
            $("#edit-class-where").val();
            $("#edit-class-when").val();
            
            $("#edit-class").popup("open");
        },
        // buttons in the class detail popup
        classPopupCancelHandler: function () {
            $("#edit-class").popup("close");
        },
        classPopupSaveHandler: function () {
            var section = makeClassSection(
                $("#edit-class-id").val(),
                $("#edit-class-title").val(),
                $("#edit-class-who").val(),
                $("#edit-class-where").val(),
                $("#edit-class-when").val()
            );
            app.classList.addClass(section);
            $("#edit-class").popup("close");
        },
        // clear the text fields in the class detail popup when it closes
        classPopupOnCloseHandler: function (event, ui) {
            $("#edit-class :text").val("");
        },

        
         
        /***************************************************************************
         * Dev/Debug stuff
         **************************************************************************/
        
        logSqlError: function (error, statement) {
            console.log(error);
            console.log(statement);
        },
        
        /* DELETE ME LATER!
         * Creates some sample class rows to query against.
         */
        makeSampleClasses: function () {
            var someClasses = [
                makeClassSection("ITEC 110", "Principles of Information Technology", "Dr. Htay", "MG 203", "TR 3:30 - 4:45 PM"),
                makeClassSection("ITEC 120", "Principles of Computer Science I", "Dr. Braffitt", "DA 225", "MWRF 11 - 11:50 AM"),
                makeClassSection("MATH 151", "Calculus I", "Cabbage", "RU 314", "MWF 1 - 1:50 PM"),
                makeClassSection("ART 111", "Art Appreciation", "Pop", "Porterfield", "MWF 9 - 9:50 AM")
            ];
            for (var i = 0; i < someClasses.length; ++i) {
                app.classList.addClass(someClasses[i]);
            }
        },
        
        /***************************************************************************
         * ClassList singleton object
         **************************************************************************/
        classList: function () {
            // table of classes, so we don't have to re-query the db all the time
            var allClasses = {};
            
            // generate html to represent a single class in our list of classes
            var getClassListItemHtml = function (cls) {
                return "<li><a id='" + cls.name + "' class='class-list-item' href='#'>\
                        " + cls.name + "<p><strong>" + cls.title + "</strong></p> \
                        <p>" + cls.instructor + "</p><p>" + cls.location + "</p> \
                        <p>" + cls.times +"</p></a></li>";
            };
            
            // rebuild the displayed jQuery listView in the classes tab
            var updateClassListDom = function () {
                $("ul#classList").empty();
                for (var id in allClasses) {
                    if (allClasses.hasOwnProperty(id)) {
                        var oneClass = allClasses[id];
                        var $newBits = $(getClassListItemHtml(oneClass));
                        $("ul#classList").append($newBits);
                    }
                }
                var $addBtn = $("<li data-icon='plus'><a href='#' id='add-new-class-btn'>Add new class...</a></li>");
                $("ul#classList").append($addBtn);
                $("#add-new-class-btn").on("click", app.addNewClassHandler);
                $("ul#classList").on("click", "li a.class-list-item", app.editClassHandler);
                $("ul#classList").listview("refresh");
            };
            
            // return public methods in an object literal
            return {
                /* Given a classSection object, insert to table, add in list, 
                 * and rebuild the view if all that was successful
                 */
                addClass: function (cls) {
                    html5sql.process(
                        [{
                            "sql": "Insert or Replace into Classes Values (?, ?, ?, ?, ?)",
                            "data": [ cls.name, cls.title, cls.instructor, cls.location, cls.times ],
                            "success": function (transaction, results) {} // don't care...
                        }],
                        function () {
                            allClasses[cls.name] = cls;
                            updateClassListDom();
                        },
                        app.logSqlError
                    );
                },
                /* Given a class id ("ITEC 324") and a new object to represent
                 * its attributes, update in the DB and list, and 
                 * redraw the view if successful
                 */
                editClass: function (clsId, newCls) {
                    // do stuff
                },
                /* Given a class id, remove that class from memory and db
                 * and redraw the class list view
                 */
                removeClass: function (clsId) {
                    // do stuff
                },
                /** queries the database for all class data,
                 * populates allClasses list, and rebuilds the 'view'
                 */
                populateClassList: function () {
                    // clear the allClasses table, jic
                    allClasses = {};
                    // call the local db; callbacks re-populat allClasses
                    html5sql.process(
                        [{
                            "sql": "Select * From Classes Where cname != 'none'",
                            "data": [],
                            "success": function (transaction, result) {
                                var rl = result.rows.length;
                                for (var i = 0; i < rl; ++i) {
                                    var r = result.rows.item(i);
                                    var someClass = makeClassSection(r.cname, r.ctitle, r.instructor, r.location, r.times);
                                    allClasses[someClass.name] = someClass;
                                }
                            }
                        }],
                        function () {
                            // if our sql executes, update the 'view'
                            updateClassListDom();
                        },
                        app.logSqlError
                    );
                },
                /* Grab an array of the class id's we are storing in the list
                 */
                getClassIds: function () {
                    var idArr = [];
                    for (var id in allClasses) {
                        if (allClasses.hasOwnProperty(id)) {
                            idArr.push(id);
                        }
                    }
                    return idArr;
                }
            };  // end public classList methods
        }(),
    };
}(this));   // end everything
