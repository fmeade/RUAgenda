/*
*  index.js
*  Bowtie Code
*
*  Functionality for the application
*/

/*
 * TODO: migrate database functionality to 'com.phonegap.plugins.sqlite'
 * @see https://github.com/brodysoft/Cordova-SQLitePlugin
 */
(function () {
    /* yes please */
    'use strict';
    /* Structure for a single class/section/course */
    var makeCourse = function (_name, _title, _instructor, _location, _times) {
        // create a new object from the Object prototype
        var that = Object.create(null);
        // add class section properties to it
        that.name = _name;
        that.title = _title;
        that.instructor = _instructor;
        that.location = _location;
        that.times = _times;
        // return the extended object
        return that;
    };
    /* Structure for a single assginment's attributes */
    var makeAssignment = function (_title, _desc, _due, _notify, _course) {
        var that = Object.create(null);
        that.title = _title;
        that.desc = _desc;
        that.dueDate = _due;
        that.notifyDate = _notify;
        that.course = _course;
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
            app.courseList.readCourseList();
        },
        /* handler when we tapclick the "Add new class" list item */
        addNewClassHandler: function (/* event */) {
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
            var lid, cls;
            // show the delete/remove button
            $("#edit-class-delete").show();
            // disable editing the name/id of the class (it's the key)
            $("#edit-class-id").prop("disabled", true);
            // set the 'legend' text
            $("div#edit-class h3").text("Edit class details");
            // need to pre-populate the form w/ values
            lid = event.currentTarget.id;
            cls = app.courseList.getOne(lid);
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
                app.courseList.deleteOne(cid);
            }

            //if (cid !== "") {
                app.classList.removeClass(cid);
           // }

            $("#edit-class").popup("close");
        },
        /* handler for the save button in the class detail view */
        classPopupSaveHandler: function () {
            var section = makeCourse(
                $("#edit-class-id").val(),
                $("#edit-class-title").val(),
                $("#edit-class-who").val(),
                $("#edit-class-where").val(),
                $("#edit-class-when").val()
            );
            /* rudimentary opaque validation, no empty class names */
            if (section.name !== "") {
                app.courseList.save(section);
            }
            $("#edit-class").popup("close");
        },
        /* clear the text fields in the class detail popup when it closes */
        classPopupOnCloseHandler: function (/*event, ui*/) {
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
                makeCourse("ITEC 110", "Principles of Information Technology", "Dr. Htay", "MG 203", "TR 3:30 - 4:45 PM"),
                makeCourse("ITEC 120", "Principles of Computer Science I", "Dr. Braffitt", "DA 225", "MWRF 11 - 11:50 AM"),
                makeCourse("MATH 151", "Calculus I", "Cabbage", "RU 314", "MWF 1 - 1:50 PM"),
                makeCourse("ART 111", "Art Appreciation", "Pop", "Porterfield", "MWF 9 - 9:50 AM")
            ], i = 0, scl = someClasses.length;
            for (i; i < scl; i += 1) {
                app.courseList.addClass(someClasses[i]);
            }
        },
        /***************************************************************************
         * courseList singleton object
         * 'Mega-list' object that keeps in-memory class/assignment objects
         * and has public methods for adding/deleting stuff and things.
         * Note: The private members are comma-separated; all part of the same 'var' declaration
         **************************************************************************/
        courseList: (function () {
            var allCourses = {};
            // return public methods in an object literal
            return {
                /* Given a classSection object, insert to table, add in list, 
                 * and rebuild the view if all that was successful
                 */
                save: function (course) {
                    html5sql.process(
                        [{
                            "sql": "Insert or Replace into Classes Values (?, ?, ?, ?, ?)",
                            "data": [ course.name, course.title, course.instructor, course.location, course.times ],
                            "success": function (transaction, results) {} // don't care...
                        }],
                        function () {
                            allCourses[course.name] = course;
                            app.domFuncs.updateCourseListDom();
                        },
                        app.logSqlError
                    );
                },
                /* Given a class id, remove that class from memory and db
                 * and redraw the class list view
                 */
                deleteOne: function (courseId) {
                    html5sql.process(
                        [{
                            "sql": "Delete From Classes Where cname = ?",
                            "data": [ courseId ],
                            "success": function (transaction, results) {} // don't care...
                        }],
                        function () {
                            delete allCourses[courseId];
                            app.domFuncs.updateCourseListDom();
                        },
                        app.logSqlError
                    );
                },
                /* Be careful with this!
                 * This will delete every entry in the classes datatbase!
                  */
                deleteAll: function () {
                    for (var courseId in allCourses) {
                        if (allCourses.hasOwnProperty(courseId)) {
                            courseList.deleteOne(courseId);
                        }
                    }
                },
                getOne: function (courseId) {
                    // if that id is not in our list, try to fetch it
                    return allCourses[courseId];
                },
                getAll: function () {
                    var res = [];
                    for (var id in allCourses) {
                        if (allCourses.hasOwnProperty(id)) {
                            res.push(allCourses[id]);
                        }
                    }
                    return res;
                },
                /** queries the database for all class data,
                 * populates allCourses list, and rebuilds the 'view'
                 */
                readCourseList: function () {
                    // clear the allCourses table, jic
                    allCourses = {};
                    // call the local db; callbacks re-populate allCourses
                    html5sql.process(
                        [{
                            "sql": "Select * From Classes Where cname != 'none'",
                            "data": [],
                            "success": function (transaction, result) {
                                var i = 0, rl = result.rows.length, r, someClass;
                                for (i; i < rl; i += 1) {
                                    r = result.rows.item(i);
                                    someClass = makeCourse(r.cname, r.ctitle, r.instructor, r.location, r.times);
                                    allCourses[someClass.name] = someClass;
                                }
                            }
                        }],
                        function () {
                            app.domFuncs.updateCourseListDom();
                        },
                        app.logSqlError
                    );
                },
                /* Grab an array of the class id's we are storing in the list
                 */
                getClassIds: function () {
                    var id, idArr = [];
                    for (id in allCourses) {
                        if (allCourses.hasOwnProperty(id)) {
                            idArr.push(id);
                        }
                    }
                    return idArr;
                }
            };  // end public courseList methods
        }()),
        /* contains the funcs for updating dom */
        domFuncs: (function () {
            var getCourseListItemHtml = function (cls) {
                var piecesArr = ["<li if='", cls.name + "-li", "'><a id='", cls.name,
                    "' class='class-list-item' href='#'>", cls.name, "<p><strong>",
                    cls.title, "</strong></p><p>", cls.instructor, "</p><p>",
                    cls.location, "</p><p>", cls.times, "</p></a></li>"];
                return piecesArr.join("");
            };
            return {
                // rebuild the displayed jQuery listView in the classes tab
                updateCourseListDom: function () {
                    var id, oneClass, $newBits,
                        allClasses = app.courseList.getAll(),
                        $addBtn = $("<li data-icon='plus'><a href='#' id='add-new-class-btn'>Add new class...</a></li>");
                    $("ul#classList").empty();
                    for (id in allClasses) {
                        if (allClasses.hasOwnProperty(id)) {
                            oneClass = allClasses[id];
                            $newBits = $(getCourseListItemHtml(oneClass));
                            $("ul#classList").append($newBits);
                        }
                    }
                    $("ul#classList").append($addBtn);
                    $("#add-new-class-btn").on("click", app.addNewClassHandler);
                    $("ul#classList").on("click", "li a.class-list-item", app.editClassHandler);
                    $("ul#classList").listview("refresh");
                }
            };
            
        }())

    };
}(this));   // end everything
