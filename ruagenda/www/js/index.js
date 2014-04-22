/*  index.js
 *  Bowtie Code - Spring 2014
 *
 *  JavaScript code for the RU Agenda Phonegap application
 *
 * TODO: migrate database functionality to 'com.phonegap.plugins.sqlite'
 * @see https://github.com/brodysoft/Cordova-SQLitePlugin
 */
(function () {
    /* yes please */
    'use strict';
    var courseList, // object holds list of courses and manages 'Classes' table in db
        taskList;   // " " " " assignments and manages 'Assignments' table in db
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
     * Used to initialize the 'courseList' object.
     * This function should only be called ONCE, after the database has been initialized.
     * (courseList ought to be a singleton, but is not because its initialization depends
     * on database initialization.)
     * @return {Course List Object}
     */
    function initCourseList () {
        // private ibject mapping course name/ids to course objects
        var allCourses = {};
        // initialize the above from the db when we create the object
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
                builders.updateCourseListDom();
            },
            app.logSqlError
        );
        // return public methods in an object literal
        return {
            /**
             * Adds a course to list and database, calls dom update method on success.
             * @param {Course Object} course
             */
            saveCourse: function (course) {
                html5sql.process(
                    [{
                        "sql": "Insert or Replace into Classes Values (?, ?, ?, ?, ?)",
                        "data": [ course.name, course.title, course.instructor, course.location, course.times ],
                        "success": function (transaction, results) {} // don't care...
                    }],
                    function () {
                        allCourses[course.name] = course;
                        builders.updateCourseListDom();
                    },
                    app.logSqlError
                );
            },
            /** TODO: not used
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
                        builders.updateCourseListDom();
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
                        builders.updateCourseListDom();
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
        // private mapping of task ids (md5 of name and class) task objects
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
        // this call initializes the allTasks object map from the db
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
        // returning public methods in an object literal
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
             * Retrieve an object mapping class names to arrays of tasks
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
    /**
     * Externally accessible namespace - functions in this object can be called 
     * from html (debug console) as `app.funcName();`
     * @type {Object}
     */
    window.app = {
        /**
         * Application entry point, called from bottom of HTML document
         * @return {undefined}
         */
        initialize: function () {
            this.bindEvents();
        },
        /**
         * Bind any events that are required on startup. 
         * ('load'.'deviceready', 'online', 'offline', etc.)
         * @return {undefined}
         */
        bindEvents: function () {
            document.addEventListener('deviceready', this.onDeviceReady, false);
            // TODO: these events only need to be bound after db init?
            $("#edit-class").on("popupafterclose", this.classPopupOnCloseHandler);
            $("#edit-class-delete").on("click", this.classPopupDeleteHandler);
            $("#edit-class-save").on("click", app.classPopupSaveBtnHandler);
        },
        /**
         * Initializes the local storage database.
         * Creates or connects to db via the html5sql.openDatabase method,
         * and creates our tables if they don't yet exist
         * @return {undefined}
         */
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
        /**
         * Handles the phonegap 'deviceready' event.  The Phongap api is not ready to
         * take calls until the deviceready event has fired!
         * @return {undefined}
         */
        onDeviceReady: function () {
            app.initializeLDB();
        },
        /**
         * Bound to the onclick event for the "Add new class" item at the
         * bottom of the class list.  Displays an "Add new class" popup
         * @return {undefined}
         */
        addNewClassHandler: function () {
            // hide the delete/remove button
            $("#edit-class-delete").hide();
            // enable the class title field
            $("#edit-class-id").prop("disabled", false);
            // set the 'legend' text
            $("div#edit-class h3").text("Add a new class");
            // now open the popup
            $("#edit-class").popup("open");
        },
        /**
         * Handler bound class list, catches onclick events produced by class list items.
         * Displays the view/edit detail popup for the selected class list item.
         * @param  {Event} event
         * @return {undefined}
         */
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
            // now open the popup
            $("#edit-class").popup("open");
        },
        /**
         * Handles the onlick event for the 'Delete' button in the "Edit class" popup
         * @return {undefined}
         */
        classPopupDeleteHandler: function () {
            var cid = $("#edit-class-id").val();
            if (cid !== "") {
                courseList.deleteCourse(cid);
            }
            $("#edit-class").popup("close");
        },
        /**
         * Handles the onclick even for the "Save" button in the Add New Class popup
         * @return {undefined}
         */
        classPopupSaveBtnHandler: function () {
            var section = makeCourse(
                $("#edit-class-id").val(),
                $("#edit-class-title").val(),
                $("#edit-class-who").val(),
                $("#edit-class-where").val(),
                $("#edit-class-when").val()
            );
            /* rudimentary opaque validation, no empty class names allowed */
            if (section.name !== "") {
                courseList.saveCourse(section);
            }
            $("#edit-class").popup("close");
        },
        /**
         * When the class new/detail popup closes, clear its fields
         * @return {undefined}
         */
        classPopupOnCloseHandler: function (/*event, ui*/) {
            $("#edit-class :text").val("");
        },
        addNewTaskHandler: function () {
            // hide the delete/remove button
            $("#edit-task-delete").hide();
            // enable the class title field
            $("#edit-task-id").prop("disabled", false);
            // set the 'legend' text
            $("div#edit-task h3").text("Add a new class");
            // set handler
            $("#edit-task-save").off("click");
            $("#edit-task-save").on("click", app.taskPopupAddBtnHandler);
            // now open the popup
            $("#edit-task").popup("open");
        },
        editTaskHandler: function (event) {
            var lid, task;
            // show the delete/remove button
            $("#edit-task-delete").show();
            // disable editing the name/id of the class (it's the key)
            $("#edit-task-id").prop("disabled", true);
            // set the 'legend' text
            $("div#edit-task h3").text("Edit class details");
            // need to pre-populate the form w/ values
            lid = event.currentTarget.id;
            task = taskList.getAssignment(id);
            $("#edit-task-title").val(task.title);
            $("#edit-task-description").val(task.description);
            $("#edit-task-class").val(task.class);
            $("#edit-task-dueDate").val(task.dueDate);
            $("#edit-task-notifyDate").val(task.notifyDate);
            // set handler
            $("#edit-task-save").off("click");
            $("#edit-task-save").on("click", app.classPopupEditBtnHandler);
            // now open the popup
            $("#edit-task").popup("open");
        },
        taskPopupDeleteHandler: function () {
            var cid = $("#edit-task-id").val();
            
            if (cid !== "") {
                courseList.deleteCourse(cid);
            }

            $("#edit-task").popup("close");
        },
        taskPopupAddBtnHandler: function () {
            var section = makeAssignment(
                $("#edit-task-title").val(),  // text
                $("#edit-task-description").val(), // text area
                $("#edit-task-class").val(), // drop down
                $("#edit-task-due").val(),   // datepicker
                $("#edit-task-notifyDate").val() // drop down
            );
            /* rudimentary opaque validation, no empty class names */
            if (section.name !== "") {
                taskList.addTask(section);
            }
            $("#edit-task").popup("close");
        },
        taskPopupEditBtnHandler: function () {
            taskList.editTask(
                $("#edit-task-title").val(),  // text
                $("#edit-task-description").val(), // text area
                $("#edit-task-class").val(), // drop down
                $("#edit-task-due").val(),   // datepicker
                $("#edit-task-notifyDate").val() // drop down
            );
            $("#edit-class").popup("close");
        },
        taskPopupOnCloseHandler: function (/*event, ui*/) {
            $("#edit-task :text").val("");
        },
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
        makeSampleAssignments: function () {
            var someTasks = [
                makeAssignment("Midterm","SE Midterm","ITEC 370",null,"10 minutes before"),
                makeAssignment("Final","SE Final","ITEC 370",null,"5 minutes before"),
                makeAssignment("HW","SE Hw","ITEC 370",null,"15 minutes before"),
                makeAssignment("Quiz","SE Quiz 2","ITEC 370",null,"7 minutes before"),
            ], i = 0, sTask = someTasks.length;
            for(i;i < sTask; i += 1) {
                taskList.addTask(someTasks[i]);
            }
        }
    }; // end window.app object
    /**
     * Object containing the methods that manipulate the DOM 
     * (mostly building lists to display) and some private helper methods.
     * Note: could be defined as a straightforward object literal like the app object,
     * but I don't want to forget how to declare a singleton.
     * @return {Object}
     */
    var builders = (function () {
        /**
         * Builds an HTML string for a single item in the list of courses/classes
         * @param  {Course Object} cls
         * @return {String}
         */
        var getCourseListItem = function (cls) {
            var piecesArr = ["<li if='", cls.name + "-li", "'><a id='", cls.name,
                "' class='class-list-item' href='#'>", cls.name, "<p><strong>",
                cls.title, "</strong></p><p>", cls.instructor, "</p><p>",
                cls.location, "</p><p>", cls.times, "</p></a></li>"];
            return piecesArr.join("");
        },
        /**
         * Builds HTML string for a single item in the *main* list of tasks
         * (tab one - all assignments ordered by date)
         * @param  {Task Object} taskObj
         * @return {String}
         */
        getMainTaskListItem = function (taskObj) {
            // TODO
        };
        return {
            /**
             * Rebuilds the jQuery Mobile ListView displayed in the third tab of the
             * main interface (list of all classes/courses)
             * @return {undefined}
             */
            updateCourseListDom: function () {
                var id, oneClass, $newBits,
                    allClasses = courseList.getAllCourses(),
                    $addBtn = $("<li data-icon='plus'><a href='#' id='add-new-class-btn'>Add new class...</a></li>");
                $("ul#classList").empty();
                for (id in allClasses) {
                    if (allClasses.hasOwnProperty(id)) {
                        oneClass = allClasses[id];
                        $newBits = $(getCourseListItem(oneClass));
                        $("ul#classList").append($newBits);
                    }
                }
                $("ul#classList").append($addBtn);
                $("#add-new-class-btn").on("click", app.addNewClassHandler);
                $("ul#classList").on("click", "li a.class-list-item", app.editClassHandler);
                $("ul#classList").listview("refresh");
            },
            /**
             * Rebuilds the jQuery Mobile ListView displayed in the first tab of the main
             * interface (list of all assignments ordered by date)
             * @return {undefined}
             */
            updateTaskListDom: function () {
                var id, oneTask, $newBits,
                    allTasks = taskList.getAllTasks(),
                    $addBtn = $("<li data-icon='plus'><a href='#' id='add-new-task-btn'>Add new task...</a></li>");
                $("ul#taskList").empty();
                for (id in alltasks) {
                    if (allTasks.hasOwnProperty(id)) {
                        oneTask = allTasks[id];
                        $newBits = $(getTaskListItemHtml(oneTask));
                        $("ul#taskList").append($newBits);
                    }
                }
                $("ul#taskList").append($addBtn);
                $("#add-new-task-btn").on("click", app.addNewTaskHandler);
                $("ul#taskList").on("click", "li a.task-list-item", app.editTaskHandler);
                $("ul#taskList").listview("refresh");
            }
        };    // end builders public methods
    }());    // end builders singleton
}(this));   // end everything
