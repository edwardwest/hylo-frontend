var RichText = require('../../services/RichText')
var TimeText = require('../../services/TimeText')
var truncate = require('html-truncate')

module.exports = function ($scope, $state, $rootScope, $modal, $dialog, $analytics,
  growl, Post, User, UserCache, CurrentUser, ModalLoginSignup) {
  'ngInject'

  $scope.singlePost = $state.current.data && $state.current.data.singlePost
  $scope.isCommentsCollapsed = !$scope.singlePost
  $scope.voteTooltipText = ''
  $scope.followersNotMe = []
  $scope.isFollowing = false
  $scope.joinPostText = ''
  $scope.onlyAuthorFollowing = false
  var currentUser = CurrentUser.get()
  var voteText = "click to <i class='icon-following'></i> me."
  var unvoteText = "click to un-<i class='icon-following'></i> me."

  var post = $scope.post
  $scope.postUrl = $state.href('post', {postId: post.id}, {absolute: true})

  $scope.community = Post.relevantCommunity(post, currentUser)
  $scope.otherCommunities = _.filter(post.communities, c => c.id !== $scope.community.id)

  var userEventResponse = function () {
    if (!currentUser) return ''

    var responder = _.filter(post.responders, responder => responder.id === currentUser.id)[0]
    if (responder) {
      return responder.response
    } else {
      return ''
    }
  }

  $scope.eventResponse = userEventResponse()
  $scope.eventYeses = () => _.filter(post.responders, er => er.response === 'yes')
  $scope.eventMaybes = () => _.filter(post.responders, er => er.response === 'maybe')
  $scope.eventNos = () => _.filter(post.responders, er => er.response === 'no')

  var rlResult = []

  var yesHeader = {header: 'Going', id: -1}
  var maybeHeader = {header: 'Maybe', id: -2}
  var noHeader = {header: 'Can\'t Go', id: -3}

  $scope.responderList = () => {
    rlResult.length = 0

    var yeses = $scope.eventYeses()
    var maybes = $scope.eventMaybes()
    var nos = $scope.eventNos()

    if (yeses.length > 0) {
      rlResult.push(yesHeader)
      rlResult = rlResult.concat(yeses)
    }
    if (maybes.length > 0) {
      rlResult.push(maybeHeader)
      rlResult = rlResult.concat(maybes)
    }
    if (nos.length > 0) {
      rlResult.push(noHeader)
      rlResult = rlResult.concat(nos)
    }
    return rlResult
  }

  $scope.isPostOwner = function () {
    return CurrentUser.is(post.user && post.user.id)
  }

  $scope.markFulfilled = function () {
    var modalInstance = $modal.open({
      templateUrl: '/ui/app/fulfillModal.tpl.html',
      controller: 'FulfillmentCtrl',
      keyboard: false,
      backdrop: 'static',
      scope: $scope
    })

    modalInstance.result.then(() => $analytics.eventTrack('Post: Fulfill', {post_id: post.id}))
  }

  var toggleVoteState = () => {
    post.myVote = !post.myVote
    post.votes += (post.myVote ? 1 : -1)
    $scope.voteTooltipText = post.myVote ? unvoteText : voteText
  }

  // Voting is the same thing as "liking"
  $scope.vote = function () {
    toggleVoteState()
    Post.vote({id: post.id}, function () {
      $analytics.eventTrack('Post: Like', {
        post_id: post.id,
        state: (post.myVote ? 'on' : 'off')
      })
    }, function (resp) {
      if (_.contains([401, 403], resp.status)) {
        toggleVoteState()
        $scope.$emit('unauthorized', {context: 'like'})
      }
    })
  }

  $scope.toggleComments = function () {
    if ($scope.isCommentsCollapsed) {
      $analytics.eventTrack('Post: Comments: Show', {post_id: post.id})
    }
    $scope.isCommentsCollapsed = !$scope.isCommentsCollapsed
  }

  $scope.toggleFollow = function () {
    var user = currentUser

    if (!$scope.isFollowing) {
      Post.follow({id: post.id}, function () {
        $analytics.eventTrack('Post: Join', {post_id: post.id})
        post.followers.push({
          id: user.id,
          name: user.name,
          avatar_url: user.avatar
        })
        UserCache.followedPosts.clear(user.id)
      }, function (resp) {
        if (_.contains([401, 403], resp.status)) {
          $scope.$emit('unauthorized', {context: 'follow'})
        }
      })
    } else {
      $analytics.eventTrack('Post: Leave', {post_id: post.id})
      post.followers = _.without(post.followers, _.findWhere(post.followers, {id: user.id}))
      Post.follow({id: post.id})
      UserCache.followedPosts.remove(user.id, post.id)
    }
  }

  $scope['delete'] = function () {
    $dialog.confirm({
      message: 'Are you sure you want to remove "' + post.name + '"? This cannot be undone.'
    }).then(function () {
      $scope.removeFn({postToRemove: post})
      new Post(post).$remove({})
    })
  }

  $scope.showMore = function () {
    setText(true)
  }

  $scope.openFollowers = function (isOpen) {
    if (isOpen) {
      $analytics.eventTrack('Followers: Viewed List of Followers', {num_followers: $scope.followersNotMe.length})
    }
  }

  $scope.openResponders = function (isOpen) {
    if (isOpen) {
      $analytics.eventTrack('Responders: Viewed List of Responders', {num_responders: post.responders.length})
    }
  }

  $scope.complain = function () {
    Post.complain({id: post.id}, function () {
      growl.addSuccessMessage('Thank you for reporting this. Moderators will address it within 24 hours.')
    })
  }

  $scope.postImage = function () {
    return _.find(post.media || [], m => m.type === 'image')
  }

  $scope.docs = function () {
    return _.filter(post.media || [], m => m.type === 'gdoc')
  }

  var setText = function (fullLength) {
    var text = post.description
    if (!text) text = ''

    text = RichText.present(text)

    if (!fullLength && angular.element(text).text().trim().length > 140) {
      text = truncate(text, 140)
      $scope.truncated = true
    } else {
      $scope.truncated = false
    }

    $scope.description = text
    $scope.hasDescription = angular.element(text).text().trim().length > 0
  }

  $scope.$watchCollection('post.followers', function () {
    var meInFollowers = (currentUser && _.findWhere(post.followers, {id: currentUser.id}))

    if (meInFollowers) {
      $scope.followersNotMe = _.without(post.followers, meInFollowers)
      $scope.isFollowing = true
    } else {
      $scope.followersNotMe = post.followers
      $scope.isFollowing = false
    }

    // If the only person following the post is the author we can hide the following status in the post
    var firstFollower = _.first(post.followers)
    $scope.onlyAuthorFollowing = (post.followers.length === 1 && firstFollower.name === post.user.name)
  })

  $scope.canEdit = currentUser && (post.user.id === currentUser.id || currentUser.canModerate(post.communities[0]))
  $scope.voteTooltipText = post.myVote ? unvoteText : voteText
  setText($scope.startExpanded)

  var now = new Date()
  $scope.showUpdateTime = (now - new Date(post.updated_at)) < (now - new Date(post.created_at)) * 0.8

  $scope.truncate = truncate

  $scope.showTime = function () {
    var start = new Date(post.start_time)
    var end = post.end_time && new Date(post.end_time)
    return TimeText.range(start, end)
  }

  $scope.showFullTime = function () {
    var start = new Date(post.start_time)
    var end = post.end_time && new Date(post.end_time)
    return TimeText.rangeFullText(start, end)
  }

  $scope.changeEventResponse = function (response) {
    var user = currentUser
    if (!user) return

    Post.respond({id: post.id, response: response})

    var meInResponders = _.findWhere(post.responders, {id: user.id})
    post.responders = _.without(post.responders, meInResponders)

    if ($scope.eventResponse === response) {
      $scope.eventResponse = ''
      $analytics.eventTrack('Event: Unrespond', {post_id: post.id})
    } else {
      $scope.eventResponse = response
      post.responders.push({id: user.id, name: user.name, avatar_url: user.avatar_url, response: response})
      $analytics.eventTrack('Event: Respond', {post_id: post.id, response: response})
    }
  }

  $scope.shareFacebook = function () {
    FB.ui({
      method: 'share',
      href: $scope.postUrl
    }, function (response) {})
  }

  $scope.twitterText = function () {
    var shortName = post.name
    var max = 100
    if (shortName.length > max) {
      shortName = shortName.substring(0, max - 3) + '...'
    }
    return shortName + ' via Hylo:'
  }

  $scope.hasFulfill = function () {
    return $scope.isPostOwner() && !post.fulfilled_at && post.type !== 'chat'
  }

  $scope.hasShare = function () {
    return post.public
  }

  $scope.controlsClass = function () {
    var n = 0
    n += $scope.hasFulfill() ? 1 : 0
    n += $scope.hasShare() ? 1 : 0

    switch (n) {
      case 0:
        return ''
      case 1:
        return 'four'
      case 2:
        return 'five'
    }
  }

  $scope.$on('unauthorized', function (event, data) {
    if (_.contains(['like', 'follow'], data.context)) {
      $dialog.confirm({message: 'You must log in or sign up to do that.'})
      .then(function () {
        ModalLoginSignup.start({
          finish: () => $state.reload()
        })
      })
    }
  })
}
