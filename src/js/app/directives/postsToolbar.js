module.exports = function () {
  return {
    restrict: 'E',
    scope: {
      community: '=',
      update: '&',
      hidePostButton: '@',
      hideWelcomePosts: '='
    },
    controller: function ($scope, CurrentUser) {
      'ngInject'

      $scope.currentUser = CurrentUser.get()

      $scope.selectOptions = {
        sort: [
          {label: 'Recent', value: 'recent'},
          {label: 'Top', value: 'top'}
        ],
        filter: [
          {label: 'All Posts', value: ($scope.hideWelcomePosts ? 'all' : 'all+welcome')},
          {label: 'Intentions', value: 'intention'},
          {label: 'Offers', value: 'offer'},
          {label: 'Requests', value: 'request'},
          {label: 'Chats', value: 'chat'}
        ]
      }

      $scope.selected = {
        sort: $scope.selectOptions.sort[0],
        filter: $scope.selectOptions.filter[0]
      }

      $scope.reload = function () {
        $scope.update({data: $scope.selected})
      }

      $scope.select = function (type, value) {
        $scope.selected[type] = _.find(
          $scope.selectOptions[type],
          x => x.value === value
        )

        $scope.reload()
      }

      $scope.reload()
    },
    templateUrl: '/ui/post/toolbar.tpl.html',
    replace: true
  }
}
