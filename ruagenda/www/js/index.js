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

    /* A name for the large, ungainly class/assignment list object thing. What monster is this? */
    var courseList, taskList;

    /**
     * Constructor for a single assignment (a.k.a. task) object
     * Invoked w/out the 'new' keyword: `var taskObj = makeAssignment(...);`
     * @param  {string} _title
     * @param  {string} _course
     * @param  {string} _desc
     * @param  {Date} _due
     * @param  {Date} _notify
     * @return {Task Object}
     */
    function makeAssignment (_title, _course, _desc, _due, _notify) {
        // create a new object from the Object prototype
        var that = Object.create(null);
        // add our custom attributes
        that.title = _title;
        that.course = _course;
        that.desc = _desc;
        that.dueDate = _due;
        that.notifyDate = _notify;
        that.id = md5(_title + "-" + _course);  // unique id by hashing the title and course together
        // return the extended object
        return that;
    }

    /**
     * Constructor for a single course object
     * Invoked w/out the 'new' keyword: `var courseObj = makeCourse(...);`
     * @param  {string} _name
     * @param  {string} _title
     * @param  {string} _instructor
     * @param  {string} _location
     * @param  {string} _times
     * @return {Course Object}
     */
    function makeCourse (_name, _title, _instructor, _location, _times) {
        var that = Object.create(null);
        // basic properties
        that.name = _name;
        that.title = _title;
        that.instructor = _instructor;
        that.location = _location;
        that.times = _times;

        return that;
    }

    /**
     * Used to initialize the courseList object.
     * This function should only be called ONCE, after the database has been initialized.
     * (courseList ought to be a singleton, but is not because its initialization depends
     * on database initialization.)
     * @return {Course List Object}
     */
    function initCourseList () {
        var allCourses = {};
        // when we create this, fetch data from the db
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
        // return public methods in an object literal
        return {
            /**
             * Adds a course to list and database, calls dom update method on success.
             * @param {Course Object} course
             */
            addCourse: function (course) {
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
            /**
             * Update the attributes of an existing course in the list and database.
             * Calls dom updater method on successful update.
             * @param  {String} courseId
             * @param  {String} newTitle
             * @param  {String} newIns
             * @param  {String} newLoc
             * @param  {String} newTime
             * @return {undefined}
             */
            editCourse: function (courseId, newTitle, newIns, newLoc, newTime) {
                html5sql.process(
                    [{
                        "sql": "Update Classes Set ctitle = ?, instructor = ?, location = ?, times = ? Where cname = ?",
                        "data": [ newTitle, newIns, newLoc, newTime, courseId ],
                        "success": function (transaction, results) {}
                    }],
                    function () {
                        // update in list
                        allCourses[courseId].title = newTitle;
                        allCourses[courseId].instructor = newIns;
                        allCourses[courseId].location = newLoc;
                        allCourses[courseId].times = newTime;
                        // trigger dom refresh
                        app.domFuncs.updateCourseListDom();
                    },
                    app.logSqlError
                );
            },
            /**
             * Remove a course from this list and from the database, AS WELL AS
             * deleting all assignments associated with that class.
             * Calls a dom update method after success.
             * @param  {String} courseId
             * @return {undefined}
             */
            deleteCourse: function (courseId) {
                html5sql.process(
                    [{
                        "sql": "Delete From Assignments Where course = ?",
                        "data": [ courseId ],
                        "success": function (transaction, results) {}
                    },
                    {
                        "sql": "Delete From Classes Where cname = ?",
                        "data": [ courseId ],
                        "success": function (transaction, results) {}
                    }],
                    function () {
                        delete allCourses[courseId];
                        taskList.deleteTasksByCourse(courseId);
                        app.domFuncs.updateCourseListDom();
                        // TODO: also update assignment list gui/view/bits
                    },
                    app.logSqlError
                );
            },
            /**
             * Deletes (almost) everything - all classes, and therefore all assignments for those classes.
             * @return {undefined}
             */
            deleteAllCourses: function () {
                for (var courseId in allCourses) {
                    if (allCourses.hasOwnProperty(courseId)) {
                        courseList.deleteOne(courseId);
                    }
                }
            },
            /**
             * Retrieve a course object from the list by id/name
             * @param  {String} courseId
             * @return {Course Object}
             */
            getCourse: function (courseId) {
                return allCourses[courseId];
            },
            /**
             * Retrieve an array of all courses stored in this list
             * @return {Array(CourseObject)}
             */
            getAllCourses: function () {
                var res = [];
                for (var id in allCourses) {
                    if (allCourses.hasOwnProperty(id)) {
                        res.push(allCourses[id]);
                    }
                }
                return res;
            },
            /**
             * Retrieve an array of just the ids of courses stored in this list.
             * @return {Array(String)}
             */
            getCourseIds: function () {
                var id, idArr = [];
                for (id in allCourses) {
                    if (allCourses.hasOwnProperty(id)) {
                        idArr.push(id);
                    }
                }
                return idArr;
            }
        };  // end public courseList methods
    }

    /**
     * Constructor for the taskList object.  This function should
     * only be called ONCE, after the database has been initialized.
     * @see initCourseList
     * @return {Task List Object}
     */
    function initTaskList () {
        var allTasks = {};
        /**
         * Sorts an array of task objects by date and returns sorted copy.
         * TODO: possibly sorting in the reverse order that we want?
         * @param  {Array(Task Object)} tasks
         * @return {Array(Task Object)}
         */
        function sortByDate (tasks) {
            var map = tasks.map(function (e, i) {
                return { index: i, value: e.dueDate.getTime() };
            });
            map.sort(function (a, b) {
                if (a < b) {
                    return -1;
                }
                else if (a > b) {
                    return 1;
                }
                else {
                    return 0;
                }
            });
            var result = map.map(function (e) {
                return list[e.index];
            });
            return result;
        }

        // this happens when the initializer is executed.
        html5sql.process(
            [{
                "sql": "SELECT name, course, description, dueDate, whenNotify FROM Assignments",
                "data": [],
                "success": function (transaction, result) {
                    var i = 0, rl = result.rows.length, r, oneTask;
                    for (i; i < rl; i += 1) {
                        r = result.rows.item(i);
                        oneTask = makeAssignment(r.name, r.course, r.description, new Date(r.dueDate), new Date(r.whenNotify));
                        allTasks[oneTask.id] = oneTask;
                    }
                }
            }],
            function () {
                // TODO: update display here
            },
            app.logSqlError
        );

        return {
            /**
             * Saves new or replaces existing task/assignment
             * @param  {Task Object} taskObj
             * @return {undefined}
             */
            saveTask: function (taskObj) {
                html5sql.process(
                    [{
                        "sql": "INSERT OR REPLACE INTO Assignments (name, course, description, dueDate, whenNotify) VALUES (?, ?, ?, ?, ?)",
                        "data": [ taskObj.name, taskObj.course, taskObj.desc, taskObj.dueDate.getTime(), taskObj.notifyDate.getTime() ],
                        "success": function (transaction, result) {}
                    }],
                    function () {
                        allTasks[taskObj.id] = taskObj;
                        // update display here
                    },
                    app.logSqlError
                );
            },
            /**
             * Removes a task from list and database
             * @param  {String} taskId
             * @return {undefined}
             */
            deleteTask: function (taskId) {
                var thisTask = allTasks[taskId],
                    thisName = thisTask.name,
                    thisCourse = thisTask.course;
                html5sql.process(
                    [{
                        "sql": "DELETE FROM Assignments WHERE name = ? AND course = ?",
                        "data": [ thisName, thisCourse ],
                        "success": function (transaction, result) {}
                    }],
                    function () {
                        delete allTasks[taskId];
                        // update display here
                    },
                    app.logSqlError
                );
            },
            /**
             * Removes all tasks, but not the courses
             * @return {undefined}
             */
            deleteAllTasks: function () {
                for (var id in allTasks) {
                    if (allTasks.hasOwnProperty(id)) {
                        deleteTask(id);
                    }
                }
            },
            /**
             * Removes all assignments associated with a course
             * @param  {String} courseId
             * @return {undefined}
             */
            deleteTasksByCourse: function (courseId) {
                for (var id in allTasks) {
                    if (allTasks.hasOwnProperty(id) &&
                        allTasks[id].course === courseId) {
                        deleteTask(id);
                    }
                }
            },
            /**
             * Retrieves a task object from the list by identifier
             * @param  {String} taskId
             * @return {Task Object}
             */
            getTask: function (taskId) {
                return allTasks[taskId];
            },
            /**
             * Retrieve an array of all tasks, ordered by date
             * @return {Array(Task Object)}
             */
            getAllByDate: function () {
                var id,
                    res = [];
                for (id in allTasks) {
                    if (allTasks.hasOwnProperty(id)) {
                        res.push(allTasks[id]);
                    }
                }
                return sortByDate(res);
            },
            /**
             * Retrieve an object with class id's paired to arrays of tasks
             * @return {Object { id: Array(Task Object)}}
             */
            getAllByClass: function () {
                var id, cname, task, res = {};
                // add every task to an array accessed by course attribute of the task
                for (id in allTasks) {
                    if (allTasks.hasOwnProperty(id)) {
                        task = allTasks[id];
                        cname = task.course;
                        // if the result object doesn't have an array for this course name yet, make one
                        if (res[cname] === undefined) {
                            res[cname] = [];
                        }
                        res[cname].push(task);
                    }
                }
                // sort each subarray by date
                for (cname in res) {
                    if (res.hasOwnProperty(cname)) {
                        res[cname] = sortByDate(res[cname]);
                    }
                }
                return res;
            }
        };
    }

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
        },
        /* Initialize the local storage database */
        initializeLDB: function () {
            html5sql.openDatabase("edu.radford.agenda.db", "RU-Agena-DB", 1024 * 1024 * 5);
            html5sql.process(
                [
                    "CREATE TABLE IF NOT EXISTS Classes ( cname TEXT PRIMARY KEY NOT NULL, ctitle TEXT DEFAULT '' NOT NULL, instructor TEXT, location TEXT, times TEXT );",
                    "CREATE TABLE IF NOT EXISTS Assignments ( name TEXT NOT NULL, course TEXT NOT NULL REFERENCES Classes(cname), description TEXT DEFAULT '', dueDate INTEGER, whenNotify INTEGER, CONSTRAINT task_class_pk PRIMARY KEY(name, course));"
                ],
                function () {
                    console.log("Initialized local database tables");
                    courseList = initCourseList();
                    taskList = initTaskList();
                },
                app.logSqlError
            );
        },
        /* deviceready Event Handler
         * (the phonegap api is not ready until this function is called!)
         * The scope of 'this' is the event. In order to call the 'receivedEvent'
         * function, we must explicity call 'app.receivedEvent(...);'
         */
        onDeviceReady: function () {
            app.initializeLDB();
        },
        /* handler when we tapclick the "Add new class" list item */
        addNewClassHandler: function () {
            // hide the delete/remove button
            $("#edit-class-delete").hide();
            // enable the class title field
            $("#edit-class-id").prop("disabled", false);
            // set the 'legend' text
            $("div#edit-class h3").text("Add a new class");
            // set handler
            $("#edit-class-save").off("click");
            $("#edit-class-save").on("click", app.classPopupAddBtnHandler);
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
            cls = courseList.getCourse(lid);
            $("#edit-class-id").val(cls.name);
            $("#edit-class-title").val(cls.title);
            $("#edit-class-who").val(cls.instructor);
            $("#edit-class-where").val(cls.location);
            $("#edit-class-when").val(cls.times);
            // set handler
            $("#edit-class-save").off("click");
            $("#edit-class-save").on("click", app.classPopupEditBtnHandler);
            // now open the popup
            $("#edit-class").popup("open");
        },
        /* handler for the delete button in the class detail view */
        classPopupDeleteHandler: function () {
            var cid = $("#edit-class-id").val();
            
            if (cid !== "") {
                courseList.deleteCourse(cid);
            }

            $("#edit-class").popup("close");
        },
        /* handler for the save button in the class detail view */
        classPopupAddBtnHandler: function () {
            var section = makeCourse(
                $("#edit-class-id").val(),
                $("#edit-class-title").val(),
                $("#edit-class-who").val(),
                $("#edit-class-where").val(),
                $("#edit-class-when").val()
            );
            /* rudimentary opaque validation, no empty class names */
            if (section.name !== "") {
                courseList.addCourse(section);
            }
            $("#edit-class").popup("close");
        },
        classPopupEditBtnHandler: function () {
            courseList.editCourse(
                $("#edit-class-id").val(),
                $("#edit-class-title").val(),
                $("#edit-class-who").val(),
                $("#edit-class-where").val(),
                $("#edit-class-when").val()
            );
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
                courseList.addCourse(someClasses[i]);
            }
        },
        
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
                        allClasses = courseList.getAllCourses(),
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
