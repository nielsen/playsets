angular.module( 'ngApp', ['ngRoute', 'uiSwitch', 'LocalStorageModule'])

.filter('range', function() {
  return function(val, range) {
    range = parseInt(range);
    for (var i=range; i>0; i--)
    val.push(i);
    return val;
  };
})

.filter('humanize', function () {
  return function (text) {
    if (text) {
      var string = '';
      var bits = text.split('-');

      $.each(bits, function(index, segment){
        var working_copy = segment.replace(/([A-Z])/g, ' $1').toLowerCase();
        working_copy = working_copy.charAt(0).toUpperCase() + working_copy.slice(1);

        string += working_copy + " "
      });

      return string;
    }
  };
})

.filter('dehumanize', function () {
  return function (text) {
    if (text) {
      var string = text.replace(/([A-Z])/g, ' $1').toLowerCase();
      string = string.replace(/\W|_\s+/g, '_').toLowerCase();
      return string;
    }
  };
})

.config(function ($routeProvider, $locationProvider) {
  // $locationProvider.html5Mode(true);
  $routeProvider
  .when('/:personality/:class/:profession', {
    templateUrl: 'templates/main.html'
  })
  .otherwise({
    templateUrl: 'templates/main.html'
  });
})

.config(function (localStorageServiceProvider) {
  localStorageServiceProvider
    .setPrefix('simpleQuest');
})

.run(function($rootScope, localStorageService) {
  //FastClick.attach(document.body);

  $rootScope.user = {
    name: '',
    personality: '',
    class: '',
    profession: '',
    combat: '',
    notes: 'Notes, inventory, &c.',
    energy: 10,
    hp: 30
  };

  $rootScope.dice = {
    sides: 0
  }

  $rootScope.simpleQuest = {
    'personalities' : ['calculating', 'passionate', 'righteous', 'selfish', 'wild'],
    'classes' : ['fighter', 'marksman', 'witch-doctor', 'wizard'],
    'professions' : ['animal-trainer', 'criminal', 'diplomat', 'merchant', 'performer', 'priest', 'scout', 'soldier', 'tinkerer', 'warlock'],
    'sections' : {'general' : 'visible', 'combat': 'visible', 'outOfCombat': 'visible', 'character': 'visible'}
  };

  $rootScope.gmMode = {
    supported : true,
    active : false,
    characters : localStorageService.keys(),
    selectedCharacter : ''
  }
})

.controller ('simpleQuestController', function ($scope, $rootScope, $routeParams, $location, localStorageService) {
  $rootScope.user.personality = $routeParams.personality;
  $rootScope.user.class = $routeParams.class;
  $rootScope.user.profession = $routeParams.profession;
  
  if(!localStorageService.isSupported) {
    $rootScope.gmMode.supported = false;
  }

  $scope.getMarkdown = function (category, type) {
    var uri = '';

    if ( $rootScope.user.class && type == "class" ) {
      return 'content/classes/' + $rootScope.user.class + '/' + category + '.md';  
    }

    if ( $rootScope.user.profession && type == "profession" ) {
      return 'content/professions/' + $rootScope.user.profession + '/' + category + '.md';
    }
  };

  $scope.resetCharacter = function () {
    window.location.reload();
  };

  $scope.diceBagRoll = function () {
    var result = Math.ceil(Math.random()*$rootScope.dice.sides).toString();
    alertify.alert(result);
    $rootScope.dice.sides = 0;
  };

  $scope.toggleSectionVisibility = function (section) {
    if ( $rootScope.simpleQuest.sections[section] == 'visible' ) {
      $rootScope.simpleQuest.sections[section] = 'invisible';
    } else {
      $rootScope.simpleQuest.sections[section] = 'visible';
    }
  };

  $scope.saveCharacter = function () {
    var key = $rootScope.user.name;
    if ( localStorageService.set(key, JSON.stringify( $rootScope.user ) ) ) {
      $rootScope.gmMode.characters.push( $rootScope.user.name );
      $rootScope.gmMode.selectedCharacter = $rootScope.user.name;

      // Demeter wept.
      $('#save-character').removeClass('button-highlight').addClass('button-action').html('Saved!').hide(1500);
    } else {
      $('#save-character').removeClass('button-highlight').addClass('button-caution').html('Error! :(');
    }
  };

  $scope.overrideUserScopeForCharacterChange = function () {
    var newUser = localStorageService.get( $rootScope.gmMode.selectedCharacter  );

    if ( newUser !== null ) {
    	$rootScope.user = newUser;	
    } else {
    	alert('Error loading that user. :/');
    }
    
  };

  $scope.inlineRoll = function (d) {
    event.stopPropagation();
    d = parseInt(d.replace(/[dD]/g,''));
    var result = Math.ceil(Math.random()*d).toString();

    alertify.alert(result);
  };
})

.directive('die', function($compile) {
  return {
    restrict: 'E',
    replace: 'true',
    link: function ($scope, $elem, attr) {
      var html =  '<span class="die" ng-click="inlineRoll(\'' + $elem.text().toString() + '\')">' + $elem.text() + '</span>';
      $compile(html)($scope, function(elem) { $elem.replaceWith(elem); });
    }
  };
})

.directive('md', function ($compile) {
  return {
    restrict: 'E',
    replace: 'false',
    link: function ($scope, $elem, attr) {
      var html = '<temp>' + marked($elem.text()) + "</temp>";
      var obj = $( html );
      var elementId = $elem[0].id;

      if ( elementId == "attributesWrap") {
        obj.children('h1').each( function( ) {
          var elemId = $(this)[0].id;
          $(this).nextUntil("h1").andSelf().wrapAll('<div class="twelve columns content-item minified" ng-if="user.personality == \'' + elemId +'\' || user.class == \'' + elemId +'\' || user.profession == \'' + elemId +'\'" onClick="toggle(this, \'minified\')" />');
        });
      } else {
        obj.children('h1').each( function( ) {
          $(this).nextUntil("h1")
                 .andSelf()
                 .wrapAll('<div class="twelve columns content-item minified" onClick="toggle(this, \'minified\')"/>');
        });
      }

      var startFindingText = function (x) {
        var findText = function (element, pattern, callback) {
          if(element !== undefined)
          {
            for (var childi= element.childNodes.length; childi-->0;) {
              var child= element.childNodes[childi];
              if (child.nodeType==1) {
                findText(child, pattern, callback);
              }
              else if (child.nodeType==3) {
                var matches = [];
                var match;
                while (match = pattern.exec(child.data)){
                  matches.push(match);
                }
                for (var i = matches.length; i-->0;){
                  callback.call(window, child, matches[i]);
                }
              }
            }
          }
        };

        findText(x[0],/[Dd][0-9]+/g, function(node, match) {
          var wrap = document.createElement('die');

          node.splitText(match.index+match[0].length);
          wrap.appendChild(node.splitText(match.index));
          node.parentNode.insertBefore(wrap, node.nextSibling);
        });

        return(x);
      };


      html = startFindingText(obj).html();
      
      // is there an alternative to .replaceWith, so I don't have to call window.reload() to remove sticky cards?
      $compile(html)($scope, function(elem) { $elem.replaceWith(elem); });
    }
  };
});

var toggle = function (elem, c) {
  $(elem).toggleClass(c);
};