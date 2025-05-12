// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract VotingV2 is Ownable {
    using Counters for Counters.Counter;

    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount;
    }

    struct Election {
        uint256 id;
        string title;
        string department;
        string description;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        mapping(uint256 => Candidate) candidates;
        uint256 candidatesCount;
    }

    struct VoteHistory {
        uint256 electionId;
        uint256 candidateId;
        uint256 timestamp;
    }

    Counters.Counter private electionCounter;
    mapping(uint256 => Election) public elections;
    mapping(address => mapping(uint256 => bool)) public userVotes; // user => electionId => hasVoted
    mapping(address => VoteHistory[]) public userVoteHistory;
    mapping(address => bool) public admins;

    event ElectionCreated(uint256 indexed electionId, string title);
    event CandidateAdded(uint256 indexed electionId, uint256 indexed candidateId, string name);
    event Voted(uint256 indexed electionId, uint256 indexed candidateId, address voter);
    event ElectionClosed(uint256 indexed electionId);

    modifier onlyAdmin() {
        require(admins[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    modifier electionExists(uint256 _electionId) {
        require(elections[_electionId].startTime > 0, "Election does not exist");
        _;
    }

    modifier validElectionTime(uint256 _electionId) {
        require(block.timestamp >= elections[_electionId].startTime, "Election not started");
        require(block.timestamp <= elections[_electionId].endTime, "Election ended");
        _;
    }

    modifier hasNotVoted(uint256 _electionId) {
        require(!userVotes[msg.sender][_electionId], "Already voted in this election");
        _;
    }

    constructor() {
        // Add initial admin (owner)
        admins[msg.sender] = true;
    }

    function addAdmin(address _admin) external onlyOwner {
        admins[_admin] = true;
    }

    function removeAdmin(address _admin) external onlyOwner {
        require(_admin != msg.sender, "Cannot remove self");
        admins[_admin] = false;
    }

    function createElection(
        string memory _title,
        string memory _department,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime
    ) external onlyAdmin {
        require(_startTime > block.timestamp, "Start time must be in future");
        require(_endTime > _startTime, "End time must be after start time");

        electionCounter.increment();
        uint256 electionId = electionCounter.current();

        // Initialize election field by field
        elections[electionId].id = electionId;
        elections[electionId].title = _title;
        elections[electionId].department = _department;
        elections[electionId].description = _description;
        elections[electionId].startTime = _startTime;
        elections[electionId].endTime = _endTime;
        elections[electionId].isActive = true;
        elections[electionId].candidatesCount = 0;

        emit ElectionCreated(electionId, _title);
    }

    function addCandidate(
        uint256 _electionId,
        string memory _name
    ) external onlyAdmin electionExists(_electionId) {
        require(elections[_electionId].isActive, "Election is not active");
        
        elections[_electionId].candidatesCount++;
        uint256 candidateId = elections[_electionId].candidatesCount;

        // Initialize candidate field by field
        Candidate storage candidate = elections[_electionId].candidates[candidateId];
        candidate.id = candidateId;
        candidate.name = _name;
        candidate.voteCount = 0;

        emit CandidateAdded(_electionId, candidateId, _name);
    }

    function vote(
        uint256 _electionId,
        uint256 _candidateId
    ) external electionExists(_electionId) validElectionTime(_electionId) hasNotVoted(_electionId) {
        require(elections[_electionId].isActive, "Election is not active");
        require(_candidateId <= elections[_electionId].candidatesCount, "Invalid candidate ID");

        // Record the vote
        userVotes[msg.sender][_electionId] = true;
        
        // Update vote history
        userVoteHistory[msg.sender].push(VoteHistory({
            electionId: _electionId,
            candidateId: _candidateId,
            timestamp: block.timestamp
        }));

        // Update candidate's vote count
        elections[_electionId].candidates[_candidateId].voteCount++;

        emit Voted(_electionId, _candidateId, msg.sender);
    }

    function closeElection(uint256 _electionId) external onlyAdmin electionExists(_electionId) {
        require(block.timestamp > elections[_electionId].endTime, "Election still active");
        require(elections[_electionId].isActive, "Election is not active");

        elections[_electionId].isActive = false;
        emit ElectionClosed(_electionId);
    }

    function getElection(uint256 _electionId) external view returns (
        uint256 id,
        string memory title,
        string memory department,
        string memory description,
        uint256 startTime,
        uint256 endTime,
        bool isActive,
        uint256 candidatesCount
    ) {
        Election storage election = elections[_electionId];
        return (
            election.id,
            election.title,
            election.department,
            election.description,
            election.startTime,
            election.endTime,
            election.isActive,
            election.candidatesCount
        );
    }

    function getCandidate(
        uint256 _electionId,
        uint256 _candidateId
    ) external view returns (uint256 id, string memory name, uint256 voteCount) {
        Candidate storage candidate = elections[_electionId].candidates[_candidateId];
        return (candidate.id, candidate.name, candidate.voteCount);
    }

    function hasUserVoted(uint256 _electionId, address _user) external view returns (bool) {
        return userVotes[_user][_electionId];
    }

    function isElectionActive(uint256 _electionId) external view returns (bool) {
        Election storage election = elections[_electionId];
        return election.isActive && block.timestamp <= election.endTime;
    }

    function getUserVoteHistory(address _user) external view returns (VoteHistory[] memory) {
        return userVoteHistory[_user];
    }

    function getUserTotalVotes(address _user) external view returns (uint256) {
        return userVoteHistory[_user].length;
    }
}