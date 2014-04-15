/*
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
        // Entry point.  This function is called from bottom of HTML page.
        initialize: function () {
            this.bindEvents();
        },
        /* Bind Event Listeners
         * Bind any events that are required on startup. Common events are:
         * 'load', 'deviceready', 'offline', and 'online'.
         * TODO: How to use both jQuery '*ready' events AND the phonegap ready events?
         */
        bindEvents: function () {
            document.addEventListener('deviceready', this.onDeviceReady, false);
            
            $("#edit-class").on("popupafterclose", this.classPopupOnCloseHandler);
            $("#edit-class-delete").on("click", this.classPopupDeleteHandler);
            $("#edit-class-save").on("click", this.classPopupSaveHandler);
        },
        /* Initialize the local storage database */
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
        /***********************************************************************
         * Event handlers
         **********************************************************************/
        /* deviceready Event Handler
         * (the phonegap api is not ready until this function is called!)
         * The scope of 'this' is the event. In order to call the 'receivedEvent'
         * function, we must explicity call 'app.receivedEvent(...);'
         */
        onDeviceReady: function () {
            app.initializeLDB();
            /* use for initial table population if you need more data
             * app.makeSampleClasses(); */
            app.classList.populateClassList();
        },
        /* handler when we tapclick the "Add new class" list item */
        addNewClassHandler: function (event) {
            // hide the delete/remove button
            $("#edit-class-delete").hide();
            // enable the class title field
            $("#edit-class-id").prop("disabled", false);
            // set the 'legend' text
            $("div#edit-class h3").text("Add a new class");
            // now open the popup
            $("#edit-class").popup("open");
        },
        /* handler when we tapclick an existing item in the list of classes */
        editClassHandler: function (event) {
            // show the delete/remove button
            $("#edit-class-delete").show();
            // disable editing the name/id of the class (it's the key)
            $("#edit-class-id").prop("disabled", true);
            // set the 'legend' text
            $("div#edit-class h3").text("Edit class details");
            // need to pre-populate the form w/ values
            var lid = event.currentTarget.id;
            var cls = app.classList.getClassById(lid);
            $("#edit-class-id").val(cls.name);
            $("#edit-class-title").val(cls.title);
            $("#edit-class-who").val(cls.instructor);
            $("#edit-class-where").val(cls.location);
            $("#edit-class-when").val(cls.times);
            // now open the popup
            $("#edit-class").popup("open");
        },
        /* handler for the delete button in the class detail view */
        classPopupDeleteHandler: function () {
            var cid = $("#edit-class-id").val();
            if (cid !== "") {
                app.classList.removeClass(cid);
            }
            $("#edit-class").popup("close");
        },
        /* handler for the save button in the class detail view */
        classPopupSaveHandler: function () {
            var section = makeClassSection(
                $("#edit-class-id").val(),
                $("#edit-class-title").val(),
                $("#edit-class-who").val(),
                $("#edit-class-where").val(),
                $("#edit-class-when").val()
            );
            /* rudimentary opaque validation, no empty class names */
            if (section.name !== "") {
                app.classList.saveClass(section);
            }
            $("#edit-class").popup("close");
        },
        /* clear the text fields in the class detail popup when it closes */
        classPopupOnCloseHandler: function (event, ui) {
            $("#edit-class :text").val("");
        },
        /***************************************************************************
         * Dev/Debug stuff
         **************************************************************************/
        /* generic and mostly useless SQL error printing callback */
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
         * 'Mega-list' object that keeps in-memory class/assignment objects
         * and has public methods for adding/deleting stuff and things.
         **************************************************************************/
        classList: function () {
            // table of classes, so we don't have to re-query the db all the time
            var allClasses = {};
            
            // generate html to represent a single class in our list of classes
            var getClassListItemHtml = function (cls) {
                var piecesArr = ["<li if='", cls.name + "-li", "'><a id='", cls.name,
                    "' class='class-list-item' href='#'>", cls.name, "<p><strong>",
                    cls.title, "</strong></p><p>", cls.instructor, "</p><p>", 
                    cls.location, "</p><p>", cls.times, "</p></a></li>"];
                return piecesArr.join("");
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
                saveClass: function (cls) {
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
                /* Given a class id, remove that class from memory and db
                 * and redraw the class list view
                 */
                removeClass: function (clsId) {
                    html5sql.process(
                        [{
                            "sql": "Delete From Classes Where cname = ?",
                            "data": [ clsId ],
                            "success": function (transaction, results) {} // don't care...
                        }],
                        function () {
                            delete allClasses[clsId];
                            updateClassListDom();
                        },
                        app.logSqlError
                    );
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
                },
                /* pull one class object from the list by its id
                 */
                getClassById: function(cid) {
                    return allClasses[cid];
                }
            };  // end public classList methods
        }(),
    };
}(this));   // end everything
